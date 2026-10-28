/**
 * Executa `work` numa unica transacao: tudo que os repositorios gravarem dentro dela
 * e confirmado junto ou desfeito junto, se `work` lancar. Os repositorios participam
 * da transacao em andamento sem receber nenhum parametro extra.
 */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}
