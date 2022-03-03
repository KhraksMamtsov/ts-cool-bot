type _VectorOf<
  T,
  N extends number,
  R extends readonly T[]
> = R["length"] extends N ? R : _VectorOf<T, N, readonly [T, ...R]>;

type VectorType<V extends Vector<any, number>> = V extends Vector<
  infer T,
  number
>
  ? T
  : never;
type VectorLength<V extends Vector<any, number>> = V["length"];

export type Vector<T, N extends number> = N extends N
  ? number extends N
    ? readonly T[]
    : _VectorOf<T, N, readonly []>
  : never;

type Increment<N extends number, T extends any[] = []> = T["length"] extends N
  ? [...T, T]["length"]
  : Increment<N, [...T, T]>;

type Decrement<
  N extends number,
  Acc extends number[] = []
> = Acc["length"] extends N
  ? Acc extends [...number[], infer L]
    ? L
    : 0
  : Decrement<N, [...Acc, Acc["length"]]>;

type Sum<A extends number, B extends number> = B extends 0
  ? A
  : Sum<Increment<A>, Decrement<B>>;

export function from<Args extends Vector<any, number>>(
  ...elements: Args
): Vector<VectorType<Args>, VectorLength<Args>> {
  return elements as any;
}
export function map<A extends never, B, Fn extends (x: A) => B>(
  fn: Fn
): <V extends Vector<Parameters<Fn>[number], number>>(
  vector: V
) => Vector<ReturnType<Fn>, VectorLength<V>> {
  return (vector) => vector.map(fn) as any;
}
/**
 * Добавляет элементы в вектор
 */
export function add<Args extends Vector<any, number>>(
  ...elements: Args
): <Args2 extends Vector<VectorType<Args>, number>>(
  vector: Args2
) => Vector<VectorType<Args>, Sum<VectorLength<Args>, VectorLength<Args2>>> {
  return (vector) => [...vector, ...elements] as any;
}
