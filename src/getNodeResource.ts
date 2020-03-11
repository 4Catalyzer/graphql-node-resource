import { GraphQLResolveInfo } from 'graphql';

import getParentNodeType from './getParentNodeType';
import { Context } from './types/Context';

export default function getNodeResource(
  context: Context,
  info: GraphQLResolveInfo,
) {
  return getParentNodeType(info).getResource(context);
}
