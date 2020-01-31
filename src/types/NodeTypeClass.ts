// eslint-disable-next-line max-classes-per-file
import {
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLInterfaceType,
  GraphQLString,
  GraphQLFieldConfig,
  GraphQLFieldResolver,
} from 'graphql';
import { connectionDefinitions, globalIdField } from 'graphql-relay';
import invariant from 'invariant';

import camelCase from 'lodash/camelCase';
import Resource from '../resources/Resource';
import { Model, ModelSource, ModelStub } from '../resources/Model';
import resolveThunk from '../utils/resolveThunk';
import ResourceManager from './ResourceManager';

// TSource,
//   TFields extends keyof TSource = keyof TSource

type CreateResolve<TSource, TContext> = <TFields extends keyof TSource>(
  resolve: GraphQLFieldResolver<Pick<TSource, TFields>, TContext>,
  fieldNames: Array<TFields>,
) => GraphQLFieldConfig<TSource, TContext>['resolve'];

export interface NodeTypeConfig<R extends Resource, M extends Model>
  extends Omit<
    GraphQLObjectTypeConfig<ModelSource<M>, R['context']>,
    'fields'
  > {
  localIdFieldName?: string | null | undefined;
  createResource: (contxt: R['context']) => R;
  model: M;

  fields: (
    createResolve: CreateResolve<ModelSource<M>, R['context']>,
  ) => {
    [key: string]: GraphQLFieldConfig<ModelStub<M>, R['context']>;
  };

  localIdFieldMode?: 'include' | 'omit' | 'deprecated';
  resourceManager: ResourceManager;
  typesManager: Map<string, GraphQLObjectType>;
  nodeInterface: GraphQLInterfaceType;
}

function getLocalIdFieldName(name: string, localIdFieldName?: string | null) {
  if (localIdFieldName !== undefined) return localIdFieldName;

  return `${camelCase(name)}Id`;
}

export default class NodeType<
  R extends Resource<any, TSource>,
  TSource = {},
  TStub = {}
> extends GraphQLObjectType {
  Connection: GraphQLObjectType;

  Edge: GraphQLObjectType;

  model: Model<TSource, TStub>;

  localIdFieldName: string | null | undefined;

  protected resourceManager: ResourceManager;

  protected getNodeObject(obj: TSource, context: R['context']) {
    const resource = this.getResource(context);
    return resource.get(this.getLocalId(obj));
  }

  protected async getNodeValue(
    obj: TSource,
    fieldName: keyof TSource,
    context: R['context'],
  ) {
    if (obj[fieldName] === undefined) {
      const fullObj = await this.getNodeObject(obj, context);
      return fullObj && fullObj[fieldName];
    }

    return obj[fieldName];
  }

  protected getLocalId(obj: TSource) {
    const id = this.model.makeId(obj);
    if (!id) throw new Error('null local id');

    return id;
  }

  protected createResolve<TFields extends keyof TSource>(
    resolve: GraphQLFieldResolver<Pick<TSource, TFields>, R['context']>,
    fieldNames: TFields[],
  ): GraphQLFieldConfig<TSource, R['context']>['resolve'] {
    return async (obj, args, context, info) => {
      for (const fieldName of fieldNames) {
        if (obj[fieldName] === undefined) {
          // await in a loop is OK here. dataloader makes sure that only
          // one request is fired
          // eslint-disable-next-line no-await-in-loop
          const fullObj = await this.getNodeObject(obj, context);
          return fullObj && resolve(fullObj, args, context, info);
        }
      }

      return resolve(obj, args, context, info);
    };
  }

  createResource: (contxt: R['context']) => R;

  constructor({
    name,
    interfaces,
    localIdFieldName,
    fields,
    createResource,
    model,

    localIdFieldMode,
    resourceManager,
    typesManager,
    nodeInterface,

    ...config
  }: NodeTypeConfig<R, Model<TSource, TStub>>) {
    if (localIdFieldMode !== 'omit') {
      // eslint-disable-next-line no-param-reassign
      localIdFieldName = getLocalIdFieldName(name, localIdFieldName);
    } else {
      invariant(
        !localIdFieldName,
        "must not specify localIdFieldName when localIdFieldMode is 'omit'",
      );
    }

    super({
      ...config,
      name,
      interfaces: () => [...(resolveThunk(interfaces) || []), nodeInterface],
      fields: () => {
        const fieldConfig: Record<
          string,
          GraphQLFieldConfig<TSource, R['context']>
        > = {};

        Object.entries(fields((f1, f2) => this.createResolve(f1, f2))).forEach(
          ([fieldName, { resolve, ...field }]) => {
            fieldConfig[fieldName] = {
              ...field,
              resolve:
                resolve ||
                ((obj, _args, context, info) =>
                  this.getNodeValue(
                    obj,
                    info.fieldName as keyof TSource,
                    context,
                  )),
            };
          },
        );

        fieldConfig.id = globalIdField(undefined, (object: TSource) =>
          this.getLocalId(object),
        );

        // This will only be set if localIdFieldMode is not 'omit'.
        if (localIdFieldName) {
          fieldConfig[localIdFieldName] = {
            type: GraphQLString,
            deprecationReason:
              localIdFieldMode === 'deprecated'
                ? 'local IDs are deprecated; use "handle" if available or "id" for the global ID'
                : null,
            resolve: obj => this.getLocalId(obj),
          };
        }

        return fieldConfig;
      },
    });

    const { connectionType, edgeType } = connectionDefinitions({
      nodeType: this,
    });

    this.Connection = connectionType;
    this.Edge = edgeType;
    this.model = model;

    this.localIdFieldName = localIdFieldName;
    this.resourceManager = resourceManager;
    this.createResource = createResource;

    typesManager.set(name, this);
  }

  getResource(context: R['context']) {
    let resource = this.resourceManager.get(context, this.name);
    if (!resource) {
      resource = this.createResource(context);
      this.resourceManager.set(context, this.name, resource);
    }

    return resource as R;
  }
}
