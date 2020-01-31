// eslint-disable-next-line max-classes-per-file
export class Model<TSource = {}> {
  makeId: (obj: TSource) => string;

  constructor({ makeId }: { makeId: (obj: TSource) => string }) {
    this.makeId = makeId;
  }
  // abstract makeId(obj: TSource): string;
}

type ObjStub<T = {}> = T & { id: string };

const IdModel = new Model({
  makeId: ({ id }: { id: string }) => id,
});
