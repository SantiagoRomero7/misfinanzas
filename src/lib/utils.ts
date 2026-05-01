export const sanitize = (str: string) => 
  str.replace(/[<>{}]/g, '').trim().slice(0, 100);
