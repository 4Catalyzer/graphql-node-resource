import { GraphQLResolveInfo } from 'graphql';

import NodeType from './types/NodeType';
import asType from './utils/asType';

export default function getParentNodeType(info: GraphQLResolveInfo) {
  return asType(info.parentType, NodeType);
}
