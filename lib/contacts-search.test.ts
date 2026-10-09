import { describe, it, expect } from 'vitest';
import { buildContactSearchOr, contactMatchesSearch, digitsOf } from './contacts-search';

const lotus = {
  name: 'Lotus Manutenção e Reparações em janelas e portas de Alumínio e PVC',
  email: null,
  phone: '+351965475915',
};

describe('digitsOf', () => {
  it('mantém só dígitos', () => {
    expect(digitsOf('+351 965-475 915')).toBe('351965475915');
    expect(digitsOf('Lotus')).toBe('');
  });
});

describe('buildContactSearchOr', () => {
  it('inclui sempre nome, email e telefone', () => {
    const or = buildContactSearchOr('Lotus');
    expect(or).toContain('name.ilike');
    expect(or).toContain('email.ilike');
    expect(or).toContain('phone.ilike');
  });

  it('acrescenta a variante só-dígitos quando o termo tem separadores', () => {
    expect(buildContactSearchOr('965 475 915')).toContain('phone.ilike."%965475915%"');
  });

  it('não duplica a cláusula quando o termo já são só dígitos', () => {
    const or = buildContactSearchOr('965475915');
    expect(or.match(/phone\.ilike/g)).toHaveLength(1);
  });

  it('não acrescenta variante para termos com poucos dígitos', () => {
    expect(buildContactSearchOr('A1')).not.toContain('%1%');
  });

  it('protege vírgulas e parênteses, que partiriam a sintaxe do .or', () => {
    const or = buildContactSearchOr('Silva, Lda (Seixal)');
    expect(or).toContain('"%Silva, Lda (Seixal)%"');
    // uma cláusula por coluna: name, email, phone — nem mais, nem menos
    expect(or.split('.ilike.')).toHaveLength(4);
  });
});

describe('contactMatchesSearch', () => {
  it('encontra pelo número exacto como está guardado', () => {
    expect(contactMatchesSearch(lotus, '+351965475915')).toBe(true);
  });

  it('encontra sem indicativo', () => {
    expect(contactMatchesSearch(lotus, '965475915')).toBe(true);
  });

  it('encontra com espaços e hífenes', () => {
    expect(contactMatchesSearch(lotus, '965 475 915')).toBe(true);
    expect(contactMatchesSearch(lotus, '965-475-915')).toBe(true);
  });

  it('continua a encontrar pelo nome', () => {
    expect(contactMatchesSearch(lotus, 'lotus')).toBe(true);
  });

  it('não encontra um número diferente', () => {
    expect(contactMatchesSearch(lotus, '912345678')).toBe(false);
  });

  it('aguenta contacto sem telefone nem email', () => {
    expect(contactMatchesSearch({ name: 'X', email: null, phone: null }, '965475915')).toBe(false);
  });

  it('termo vazio não filtra nada', () => {
    expect(contactMatchesSearch(lotus, '   ')).toBe(true);
  });
});
