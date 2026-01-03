import type { GraphQLResolveInfo } from 'graphql';

import NodeType from './types/NodeType.js';
import asType from './utils/asType.js';

export default function getParentNodeType(info: GraphQLResolveInfo) {
  return asType(info.parentType, NodeType);
}
