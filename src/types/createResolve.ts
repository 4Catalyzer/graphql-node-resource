import type { GraphQLFieldConfig, GraphQLFieldResolver } from 'graphql';

import NodeType from './NodeType.js';
import type { Obj } from '../utils/typing.js';

export default function createResolve<
  TSource extends Obj,
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
