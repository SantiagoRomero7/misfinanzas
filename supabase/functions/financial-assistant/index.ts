import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Falta el header Authorization');
    }

    // Parsear el body para aceptar historial de mensajes
    let chatHistory: any[] = [];
    try {
      const body = await req.json();
      if (body.messages && Array.isArray(body.messages)) {
        chatHistory = body.messages;
      } else if (body.message) {
        chatHistory = [{ role: 'user', content: body.message }];
      }
    } catch (e) {
      // Body vacío
    }

    // 1. Inicializar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('No autorizado');

    // 2. Fetch de datos para contexto
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`;
    const currentMonthStr = `${year}-${month}`;

    const { data: transactions } = await supabaseClient
      .from('transactions')
      .select('type, amount, category')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    const { data: budgets } = await supabaseClient
      .from('monthly_budgets')
      .select('category, limit_amount')
      .eq('month', currentMonthStr);

    const { data: goals } = await supabaseClient
      .from('savings_goals')
      .select('name, target_amount, current_amount');

    // 3. Agregación Rica de Datos
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};

    if (transactions) {
      transactions.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'income') {
          totalIncome += amt;
        } else {
          totalExpense += amt;
          expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + amt;
        }
      });
    }

    let topCategory = '';
    let maxExpense = 0;
    for (const [cat, amt] of Object.entries(expenseByCategory)) {
      if (amt > maxExpense) {
        maxExpense = amt;
        topCategory = cat;
      }
    }

    const budgetDetails: string[] = [];
    if (budgets && budgets.length > 0) {
      budgets.forEach(b => {
        const spent = expenseByCategory[b.category] || 0;
        const limit = Number(b.limit_amount);
        budgetDetails.push(`- ${b.category}: Gastado $${spent} / Límite $${limit} (${Math.round((spent/limit)*100)}%)`);
      });
    }

    const goalsDetails: string[] = [];
    if (goals && goals.length > 0) {
      goals.forEach(g => {
        const target = Number(g.target_amount);
        const current = Number(g.current_amount);
        goalsDetails.push(`- Meta "${g.name}": Ahorrado $${current} / Objetivo $${target} (${Math.round((current/target)*100)}%)`);
      });
    }

    // 4. Construir System Prompt
    const systemPrompt = `Eres el asistente financiero experto y proactivo de la app MisFinanzas. Responde SIEMPRE en español. Eres conversacional, amable y motivador. Si el usuario te hace una pregunta, usa sus datos financieros para darle respuestas concretas y útiles. Mantén tus respuestas en 2 a 4 oraciones máximo.

CONTEXTO FINANCIERO DEL USUARIO (Mes Actual):
- Ingresos Totales: $${totalIncome}
- Gastos Totales: $${totalExpense}
- Categoría con mayor gasto: ${topCategory ? `${topCategory} ($${maxExpense})` : 'Ninguna'}

PRESUPUESTOS Y LÍMITES:
${budgetDetails.length > 0 ? budgetDetails.join('\n') : 'No hay presupuestos configurados.'}

METAS DE AHORRO:
${goalsDetails.length > 0 ? goalsDetails.join('\n') : 'No hay metas de ahorro.'}`;

    // Si no hay historial, es el saludo inicial proactivo
    const isInitialInsight = chatHistory.length === 0;
    let finalMessages = [
      { role: 'system', content: systemPrompt }
    ];

    if (isInitialInsight) {
      finalMessages.push({ 
        role: 'user', 
        content: "Hola. Basado en mi contexto financiero, dame un resumen muy rápido de cómo voy este mes, alerta si me paso de algún límite, y dame un consejo motivador corto." 
      });
    } else {
      // Filtrar el historial para que Groq lo entienda bien (solo role y content)
      const mappedHistory = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text || msg.content
      }));
      finalMessages = finalMessages.concat(mappedHistory);
    }

    // 5. Llamar a Groq API
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    let insight = '';
    let isFallback = false;

    if (!groqApiKey) {
      isFallback = true;
      console.error("GROQ_API_KEY no está configurada en los Secrets de Supabase.");
    } else {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey.replace(/['"]/g, '').trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: finalMessages,
            temperature: 0.7,
            max_tokens: 250,
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          insight = groqData.choices?.[0]?.message?.content?.trim();
        } else {
          isFallback = true;
          console.error("Groq API error", await groqResponse.text());
        }
      } catch (err: any) {
        isFallback = true;
        console.error("Error conectando a Groq:", err);
      }
    }

    // 6. Fallback determinista
    if (!insight) {
      if (isInitialInsight) {
        if (totalExpense > totalIncome && totalIncome > 0) {
          insight = "¡Atención! Has gastado más de lo que ha ingresado.";
        } else if (budgetWarnings.length > 0) {
          insight = budgetWarnings[0] + ".";
        } else {
          insight = "Tu balance es saludable este mes. ¡Sigue así!";
        }
      } else {
        insight = "Lo siento, mi conexión con la Inteligencia Artificial falló temporalmente. No puedo procesar tu mensaje ahora mismo.";
      }
    }

    return new Response(JSON.stringify({ insight, isFallback }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
