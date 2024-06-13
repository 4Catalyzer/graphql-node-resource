import { GraphQLFieldConfig, GraphQLFieldResolver } from 'graphql';

import NodeType from './NodeType';

/**
 * This helper creates a resolver function that fetches the parent type of the field
 * and passes the fetched object to the resolver. The parent type must be a NodeType.
 * 
 * By default, the NodeType will fetch itself when any field tries to be resolved unless
 * you implement {@link NodeType.makeObjectStub}. Thus, this should only be used in conjuction with
 * a NodeType that implements `makeObjectStub`. @see {@link NodeType.makeObjectStub} for more
 * information.
 * 
 * If the source object (ie parent type) already has the fields defined on it,
 * then no network request will be made. Otherwise, it will fetch the object
 * first.
 * 
 * Even if multiple fields use the `createResolve` helper, there will only
 * be one network request as the requests will be batched via a DataLoader.
 * 
 * NOTE: This only works for fields within a NodeType!
 * 
 * @example 
 * new NodeType({
 *  name: "Foo",
 *  fields: () => ({
 *    bar: {
 *      type: GraphQLString
 *    },
 *    baz: {
 *      type: Baz,
 *      resolve: createResolve(
 *        (source) => {
 *          // source will now have "bar" defined and it can be used for Baz
 *          return getBaz(source.bar)
 *        },
 *        // specify that we need "bar" in order to resolve "baz"
 *        ["bar"]
 *      )
 *    }
 *  })
 * })
 * 
 * @param resolve a graphql resolver function
 * @param fieldNames a list of fields that need to be resolved before calling the passed in
 * `resolve` function
 * 
 * @returns an async resolver
 */
export default function createResolve<
  TSource,
  TContext,
  TField extends string,
>(
  resolve: GraphQLFieldResolver<TSource & Record<TField, any>, TContext>,
  fieldNames: TField[],
): GraphQLFieldConfig<TSource, TContext>['resolve'] {
  return async (obj, args, context, info) => {
    const nodeType = info.parentType as NodeType<any, TSource>;
    for (const fieldName of fieldNames) {
      if ((obj as any)[fieldName] === undefined) {
        // await in a loop is OK here. dataloader makes sure that only
        // one request is fired
        // eslint-disable-next-line no-await-in-loop
        const fullObj = await nodeType.getNodeObject(obj, context);
        return fullObj && resolve(fullObj, args, context, info);
      }
    }

    return resolve(obj as any, args, context, info);
  };
}
