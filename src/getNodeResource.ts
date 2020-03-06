import { GraphQLResolveInfo } from 'graphql';

import { Context } from './types/Context';
// eslint-disable-next-line import/no-cycle
import NodeType from './types/NodeType';
import asType from './utils/asType';

export default function getNodeResource(
  context: Context,
  info: GraphQLResolveInfo,
) {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const parentType = asType(info.parentType, NodeType);
  return parentType.getResource(context);
}
