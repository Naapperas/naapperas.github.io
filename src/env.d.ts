/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

/**
 * Returns the keys of an object, correctly typed.
 * 
 * @param obj the object whose keys we want to get
 * @returns the keys of the object
 */
function typedKeys<K>(obj: K): (keyof K)[] {
    return Object.keys(obj) as (keyof typeof obj)[];
}