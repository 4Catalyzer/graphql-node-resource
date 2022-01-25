// eslint-disable-next-line max-classes-per-file

import {
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLString,
} from 'graphql';
import {
  ConnectionConfig,
  connectionDefinitions,
  globalIdField,
} from 'graphql-relay';
import camelCase from 'lodash/camelCase';

// eslint-disable-next-line import/no-cycle
import { getConfig } from '../config';
import Resource from '../resources/Resource';
import resolveThunk from '../utils/resolveThunk';
import { Obj } from '../utils/typing';

export interface NodeTypeConfig<R extends Resource, TSource>
  extends GraphQLObjectTypeConfig<TSource, R['context']> {
  localIdFieldName?: string | null | undefined;
  createResource: (context: R['context']) => R;

  makeId?: (obj: TSource) => string;

  connectionFields?: ConnectionConfig['connectionFields'];
  edgeFields?: ConnectionConfig['edgeFields'];
}

function getLocalIdFieldName(name: string, localIdFieldName?: string | null) {
  if (localIdFieldName !== undefined) return localIdFieldName;

  return `${camelCase(name)}Id`;
}

export default class NodeType<
  R extends Resource,
  TSource extends Obj = { id: string },
> extends GraphQLObjectType<TSource, R['context']> {
  Connection: GraphQLObjectType;

  Edge: GraphQLObjectType;

  localIdFieldName: NodeTypeConfig<R, TSource>['localIdFieldName'];

  makeId: NonNullable<NodeTypeConfig<R, TSource>['makeId']>;

  getNodeObject(obj: TSource, context: R['context']) {
    const resource = this.getResource(context);
    return resource.get(this.getLocalId(obj)) as Promise<
      TSource & Record<string, any>
    >;
  }

  async getNodeValue(obj: TSource, fieldName: string, context: R['context']) {
    if (obj[fieldName] === undefined) {
      const fullObj = await this.getNodeObject(obj, context);
      return fullObj && fullObj[fieldName];
    }

    return obj[fieldName];
  }

  getLocalId(obj: TSource) {
    const id = this.makeId(obj);
    if (!id) throw new Error('null local id');

    return id;
  }

  createResource: (context: R['context']) => R;

  constructor({
    name,
    interfaces,
    localIdFieldName,
    fields,
    createResource,
    makeId,

    ...rest
  }: NodeTypeConfig<R, TSource>) {
    const config = getConfig();

    if (config.localIdFieldMode !== 'omit') {
      // eslint-disable-next-line no-param-reassign
      localIdFieldName = getLocalIdFieldName(name, localIdFieldName);
    }
    if (config.localIdFieldMode === 'omit' && localIdFieldName) {
      throw new Error(
        "must not specify localIdFieldName when localIdFieldMode is 'omit'",
      );
    }

    super({
      ...rest,
      name,
      interfaces: () => [
        ...(resolveThunk(interfaces) || []),
        config.nodeInterface,
      ],
      fields: () => {
        const fieldConfig: Record<
          string,
          GraphQLFieldConfig<TSource, R['context']>
        > = {
          id: globalIdField(undefined, (object: TSource) =>
            this.getLocalId(object),
          ),
        };

        // This will only be set if localIdFieldMode is not 'omit'.
        if (localIdFieldName) {
          fieldConfig[localIdFieldName] = {
            type: GraphQLString,
            deprecationReason:
              config.localIdFieldMode === 'deprecated'
                ? 'local IDs are deprecated; use "handle" if available or "id" for the global ID'
                : null,
            resolve: (obj) => this.getLocalId(obj),
          };
        }

        Object.entries(resolveThunk(fields)!).forEach(
          ([fieldName, { resolve, ...field }]) => {
            fieldConfig[fieldName] = {
              ...field,
              resolve:
                resolve ||
                ((obj, _args, context, info) =>
                  this.getNodeValue(obj, info.fieldName, context)),
            };
          },
        );

        return fieldConfig;
      },
    });

    const { connectionType, edgeType } = connectionDefinitions({
      nodeType: this,
      connectionFields:
        rest.connectionFields || config.connectionFields
          ? () => ({
              ...resolveThunk(config.connectionFields),
              ...resolveThunk(rest.connectionFields),
            })
          : undefined,
      edgeFields:
        rest.edgeFields || config.edgeFields
          ? () => ({
              ...resolveThunk(config.edgeFields),
              ...resolveThunk(rest.edgeFields),
            })
          : undefined,
    });

    this.Connection = connectionType;
    this.Edge = edgeType;

    this.localIdFieldName = localIdFieldName;
    this.createResource = createResource;
    this.makeId = makeId || (({ id }: TSource) => id);

    config.nodeTypesByName.set(name, this);
  }

  getResource(context: R['context']) {
    const config = getConfig();
    let resource = config.resourceManager.get(context, this.name);
    if (!resource) {
      resource = this.createResource(context);
      config.resourceManager.set(context, this.name, resource);
    }

    return resource as R;
  }
}
