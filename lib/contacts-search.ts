/**
 * Pesquisa de contactos — lógica única, partilhada.
 *
 * Existia duplicada em 5 sítios (query do Supabase, dois filtros em memória do
 * cache, export CSV e a rota pública) e só a rota pública incluía o telefone.
 * Com 98% dos contactos sem email, o telefone é o identificador prático, pelo
 * que a omissão tornava a pesquisa inútil para a maioria dos registos.
 */

/** Mínimo de dígitos para pesquisar por número; abaixo disto o termo é ambíguo. */
const MIN_DIGITS = 3;

/** Só os dígitos do termo: aceita "965 475 915", "+351 965..." e "965-475-915". */
export function digitsOf(term: string): string {
  return term.replace(/\D/g, '');
}

/**
 * Valor pronto para um filtro `ilike` do PostgREST.
 * As aspas duplas protegem vírgulas e parênteses, que de outro modo partiriam
 * a sintaxe do `.or()` — e com ela a pesquisa inteira, em silêncio.
 */
function ilikeValue(term: string): string {
  return `"%${term.replace(/"/g, '')}%"`;
}

/**
 * Cláusula para `query.or(...)`: nome, email e telefone.
 * Quando o termo tem dígitos suficientes, procura também a sequência de dígitos
 * isolada, porque o telefone é guardado sem separadores (ex. `+351965475915`).
 */
export function buildContactSearchOr(term: string): string {
  const t = term.trim();
  const parts = [
    `name.ilike.${ilikeValue(t)}`,
    `email.ilike.${ilikeValue(t)}`,
    `phone.ilike.${ilikeValue(t)}`,
  ];
  const digits = digitsOf(t);
  if (digits.length >= MIN_DIGITS && digits !== t) {
    parts.push(`phone.ilike.${ilikeValue(digits)}`);
  }
  return parts.join(',');
}

/** A mesma regra em memória, para os filtros do cache e actualizações optimistas. */
export function contactMatchesSearch(
  contact: { name?: string | null; email?: string | null; phone?: string | null },
  term: string
): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  if ((contact.name || '').toLowerCase().includes(t)) return true;
  if ((contact.email || '').toLowerCase().includes(t)) return true;
  const phone = contact.phone || '';
  if (phone.toLowerCase().includes(t)) return true;
  const digits = digitsOf(t);
  if (digits.length >= MIN_DIGITS && digitsOf(phone).includes(digits)) return true;
  return false;
}
