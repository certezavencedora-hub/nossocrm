/**
 * Que campos escrever quando o upsert de `/contacts` encontra um contacto
 * que já existe.
 *
 * O POST monta um payload com todos os campos e, antes desta correcção,
 * enviava-o inteiro no `.update()`. Como as funções de normalização devolvem
 * `null` para um campo ausente, um POST com apenas telefone e nome punha a
 * `null` o stage, o status, o source, as notes, o role, o company_name e as
 * datas do contacto existente -- sem erro e sem aviso.
 *
 * Num upsert, "o campo não veio no pedido" tem de significar "não mexer".
 * Para LIMPAR um campo de propósito usa-se o PATCH, que aceita `null`
 * explícito; o schema do POST não o aceita.
 */

/** Os campos já validados e normalizados pela rota. */
export interface ContactDerived {
  name: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  clientCompanyId: string | null;
  birthDate: string | null;
  lastInteraction: string | null;
  lastPurchaseDate: string | null;
}

/** O que o pedido traz; `undefined` = ausente. */
export type ContactUpsertInput = {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  company_name?: string;
  client_company_id?: string;
  avatar?: string;
  status?: string;
  stage?: string;
  birth_date?: string;
  last_interaction?: string;
  last_purchase_date?: string;
  total_value?: number;
  source?: string;
  notes?: string;
};

function normalizeText(input: string | null | undefined): string | null {
  const v = (input ?? '').trim();
  return v ? v : null;
}

/**
 * Objecto para o `.update()`: só os campos presentes no pedido, mais o
 * `updated_at`. Nunca inclui uma chave que o pedido não trouxe.
 */
export function buildContactUpdate(
  input: ContactUpsertInput,
  derived: ContactDerived,
  now: string
): Record<string, unknown> {
  const updates: Record<string, unknown> = { updated_at: now };

  // O nome só é substituído se vier preenchido: um upsert por telefone não
  // deve poder deixar o contacto sem nome.
  if (derived.name) updates.name = derived.name;

  if (input.email !== undefined) updates.email = derived.email;
  if (input.phone !== undefined) updates.phone = derived.phone;
  if (input.role !== undefined) updates.role = normalizeText(input.role);
  if (input.avatar !== undefined) updates.avatar = normalizeText(input.avatar);
  if (input.status !== undefined) updates.status = normalizeText(input.status);
  if (input.stage !== undefined) updates.stage = normalizeText(input.stage);
  if (input.source !== undefined) updates.source = normalizeText(input.source);
  if (input.notes !== undefined) updates.notes = normalizeText(input.notes);
  if (input.company_name !== undefined) updates.company_name = derived.companyName;
  if (input.birth_date !== undefined) updates.birth_date = derived.birthDate;
  if (input.last_interaction !== undefined) updates.last_interaction = derived.lastInteraction;
  if (input.last_purchase_date !== undefined) updates.last_purchase_date = derived.lastPurchaseDate;
  if (input.total_value !== undefined) updates.total_value = input.total_value;

  // `client_company_id` pode ser derivado do `company_name`, por isso não
  // basta olhar para a chave do pedido. Só se escreve quando há um id
  // resolvido -- caso contrário apagaria uma ligação já existente.
  if (derived.clientCompanyId) updates.client_company_id = derived.clientCompanyId;

  return updates;
}
