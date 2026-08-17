export type Param = string | number | boolean | undefined;

export type PathParams = Record<string, Param>;

export type QueryParams = Record<string, Param | Array<Param>>;
