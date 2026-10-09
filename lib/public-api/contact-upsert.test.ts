import { describe, it, expect } from 'vitest';
import { buildContactUpdate, type ContactDerived } from './contact-upsert';

const NOW = '2026-10-09T12:00:00.000Z';

const vazio: ContactDerived = {
  name: null, email: null, phone: null, companyName: null,
  clientCompanyId: null, birthDate: null, lastInteraction: null, lastPurchaseDate: null,
};

describe('buildContactUpdate', () => {
  it('um upsert com só telefone e nome não toca em mais nada', () => {
    const updates = buildContactUpdate(
      { phone: '+351212530357', name: 'Auto João & Jorge' },
      { ...vazio, name: 'Auto João & Jorge', phone: '+351212530357' },
      NOW
    );
    expect(Object.keys(updates).sort()).toEqual(['name', 'phone', 'updated_at']);
    // é esta a regressão que custou o stage a 555 contactos
    expect(updates).not.toHaveProperty('stage');
    expect(updates).not.toHaveProperty('status');
    expect(updates).not.toHaveProperty('source');
    expect(updates).not.toHaveProperty('notes');
    expect(updates).not.toHaveProperty('email');
  });

  it('escreve os campos que vierem, mesmo vazios, porque foram enviados', () => {
    const updates = buildContactUpdate({ phone: '+351...', role: '   ' }, { ...vazio, phone: '+351...' }, NOW);
    expect(updates.role).toBeNull();
  });

  it('escreve o stage quando é enviado', () => {
    const updates = buildContactUpdate({ stage: 'MQL' }, vazio, NOW);
    expect(updates.stage).toBe('MQL');
  });

  it('não apaga o nome quando o upsert vem sem nome', () => {
    const updates = buildContactUpdate({ phone: '+351...' }, { ...vazio, phone: '+351...' }, NOW);
    expect(updates).not.toHaveProperty('name');
  });

  it('não apaga a ligação à empresa quando nenhum id foi resolvido', () => {
    const updates = buildContactUpdate({ company_name: 'Acme' }, { ...vazio, companyName: 'Acme' }, NOW);
    expect(updates.company_name).toBe('Acme');
    expect(updates).not.toHaveProperty('client_company_id');
  });

  it('escreve a ligação à empresa quando o id foi derivado do nome', () => {
    const id = '0f8419cc-643e-4581-b3ad-3f224e9ad6d0';
    const updates = buildContactUpdate(
      { company_name: 'Acme' },
      { ...vazio, companyName: 'Acme', clientCompanyId: id },
      NOW
    );
    expect(updates.client_company_id).toBe(id);
  });

  it('total_value a zero é um valor, não uma ausência', () => {
    const updates = buildContactUpdate({ total_value: 0 }, vazio, NOW);
    expect(updates.total_value).toBe(0);
  });

  it('um pedido vazio só mexe no updated_at', () => {
    expect(buildContactUpdate({}, vazio, NOW)).toEqual({ updated_at: NOW });
  });

  it('carimba sempre o updated_at', () => {
    expect(buildContactUpdate({ stage: 'LEAD' }, vazio, NOW).updated_at).toBe(NOW);
  });
});
