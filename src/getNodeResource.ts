import type { GraphQLResolveInfo } from 'graphql';

import getParentNodeType from './getParentNodeType.js';
import type { Context } from './types/Context.js';

export default function getNodeResource(
  context: Context,
  info: GraphQLResolveInfo,
) {
  return getParentNodeType(info).getResource(context);
}
