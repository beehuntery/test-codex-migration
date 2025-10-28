export const cache = <T>(fn: T) => fn;
export const unstable_cache = (...args: any[]) => (...fnArgs: any[]) => (
  typeof args[0] === 'function' ? (args[0] as any)(...fnArgs) : undefined
);
export const revalidateTag = () => {};
export const revalidatePath = () => {};

export default { cache, unstable_cache, revalidateTag, revalidatePath };
