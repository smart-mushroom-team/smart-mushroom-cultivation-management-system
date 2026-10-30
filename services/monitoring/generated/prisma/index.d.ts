
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Device
 * 
 */
export type Device = $Result.DefaultSelection<Prisma.$DevicePayload>
/**
 * Model CameraLatest
 * 
 */
export type CameraLatest = $Result.DefaultSelection<Prisma.$CameraLatestPayload>
/**
 * Model SensorReading
 * 
 */
export type SensorReading = $Result.DefaultSelection<Prisma.$SensorReadingPayload>
/**
 * Model RoomThreshold
 * 
 */
export type RoomThreshold = $Result.DefaultSelection<Prisma.$RoomThresholdPayload>
/**
 * Model PendingAlert
 * 
 */
export type PendingAlert = $Result.DefaultSelection<Prisma.$PendingAlertPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const DeviceType: {
  CAMERA: 'CAMERA',
  SENSOR: 'SENSOR'
};

export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType]


export const DeviceStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus]


export const ConnectionState: {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE'
};

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState]


export const MetricState: {
  NORMAL: 'NORMAL',
  ABNORMAL: 'ABNORMAL'
};

export type MetricState = (typeof MetricState)[keyof typeof MetricState]

}

export type DeviceType = $Enums.DeviceType

export const DeviceType: typeof $Enums.DeviceType

export type DeviceStatus = $Enums.DeviceStatus

export const DeviceStatus: typeof $Enums.DeviceStatus

export type ConnectionState = $Enums.ConnectionState

export const ConnectionState: typeof $Enums.ConnectionState

export type MetricState = $Enums.MetricState

export const MetricState: typeof $Enums.MetricState

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Devices
 * const devices = await prisma.device.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Devices
   * const devices = await prisma.device.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.device`: Exposes CRUD operations for the **Device** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Devices
    * const devices = await prisma.device.findMany()
    * ```
    */
  get device(): Prisma.DeviceDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.cameraLatest`: Exposes CRUD operations for the **CameraLatest** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CameraLatests
    * const cameraLatests = await prisma.cameraLatest.findMany()
    * ```
    */
  get cameraLatest(): Prisma.CameraLatestDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.sensorReading`: Exposes CRUD operations for the **SensorReading** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SensorReadings
    * const sensorReadings = await prisma.sensorReading.findMany()
    * ```
    */
  get sensorReading(): Prisma.SensorReadingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.roomThreshold`: Exposes CRUD operations for the **RoomThreshold** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RoomThresholds
    * const roomThresholds = await prisma.roomThreshold.findMany()
    * ```
    */
  get roomThreshold(): Prisma.RoomThresholdDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.pendingAlert`: Exposes CRUD operations for the **PendingAlert** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PendingAlerts
    * const pendingAlerts = await prisma.pendingAlert.findMany()
    * ```
    */
  get pendingAlert(): Prisma.PendingAlertDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Device: 'Device',
    CameraLatest: 'CameraLatest',
    SensorReading: 'SensorReading',
    RoomThreshold: 'RoomThreshold',
    PendingAlert: 'PendingAlert'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "device" | "cameraLatest" | "sensorReading" | "roomThreshold" | "pendingAlert"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Device: {
        payload: Prisma.$DevicePayload<ExtArgs>
        fields: Prisma.DeviceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DeviceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DeviceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>
          }
          findFirst: {
            args: Prisma.DeviceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DeviceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>
          }
          findMany: {
            args: Prisma.DeviceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>[]
          }
          create: {
            args: Prisma.DeviceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>
          }
          createMany: {
            args: Prisma.DeviceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DeviceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>[]
          }
          delete: {
            args: Prisma.DeviceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>
          }
          update: {
            args: Prisma.DeviceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>
          }
          deleteMany: {
            args: Prisma.DeviceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DeviceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DeviceUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>[]
          }
          upsert: {
            args: Prisma.DeviceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DevicePayload>
          }
          aggregate: {
            args: Prisma.DeviceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDevice>
          }
          groupBy: {
            args: Prisma.DeviceGroupByArgs<ExtArgs>
            result: $Utils.Optional<DeviceGroupByOutputType>[]
          }
          count: {
            args: Prisma.DeviceCountArgs<ExtArgs>
            result: $Utils.Optional<DeviceCountAggregateOutputType> | number
          }
        }
      }
      CameraLatest: {
        payload: Prisma.$CameraLatestPayload<ExtArgs>
        fields: Prisma.CameraLatestFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CameraLatestFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CameraLatestFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>
          }
          findFirst: {
            args: Prisma.CameraLatestFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CameraLatestFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>
          }
          findMany: {
            args: Prisma.CameraLatestFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>[]
          }
          create: {
            args: Prisma.CameraLatestCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>
          }
          createMany: {
            args: Prisma.CameraLatestCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CameraLatestCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>[]
          }
          delete: {
            args: Prisma.CameraLatestDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>
          }
          update: {
            args: Prisma.CameraLatestUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>
          }
          deleteMany: {
            args: Prisma.CameraLatestDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CameraLatestUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CameraLatestUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>[]
          }
          upsert: {
            args: Prisma.CameraLatestUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CameraLatestPayload>
          }
          aggregate: {
            args: Prisma.CameraLatestAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCameraLatest>
          }
          groupBy: {
            args: Prisma.CameraLatestGroupByArgs<ExtArgs>
            result: $Utils.Optional<CameraLatestGroupByOutputType>[]
          }
          count: {
            args: Prisma.CameraLatestCountArgs<ExtArgs>
            result: $Utils.Optional<CameraLatestCountAggregateOutputType> | number
          }
        }
      }
      SensorReading: {
        payload: Prisma.$SensorReadingPayload<ExtArgs>
        fields: Prisma.SensorReadingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SensorReadingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SensorReadingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>
          }
          findFirst: {
            args: Prisma.SensorReadingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SensorReadingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>
          }
          findMany: {
            args: Prisma.SensorReadingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>[]
          }
          create: {
            args: Prisma.SensorReadingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>
          }
          createMany: {
            args: Prisma.SensorReadingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SensorReadingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>[]
          }
          delete: {
            args: Prisma.SensorReadingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>
          }
          update: {
            args: Prisma.SensorReadingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>
          }
          deleteMany: {
            args: Prisma.SensorReadingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SensorReadingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SensorReadingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>[]
          }
          upsert: {
            args: Prisma.SensorReadingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SensorReadingPayload>
          }
          aggregate: {
            args: Prisma.SensorReadingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSensorReading>
          }
          groupBy: {
            args: Prisma.SensorReadingGroupByArgs<ExtArgs>
            result: $Utils.Optional<SensorReadingGroupByOutputType>[]
          }
          count: {
            args: Prisma.SensorReadingCountArgs<ExtArgs>
            result: $Utils.Optional<SensorReadingCountAggregateOutputType> | number
          }
        }
      }
      RoomThreshold: {
        payload: Prisma.$RoomThresholdPayload<ExtArgs>
        fields: Prisma.RoomThresholdFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RoomThresholdFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RoomThresholdFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>
          }
          findFirst: {
            args: Prisma.RoomThresholdFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RoomThresholdFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>
          }
          findMany: {
            args: Prisma.RoomThresholdFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>[]
          }
          create: {
            args: Prisma.RoomThresholdCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>
          }
          createMany: {
            args: Prisma.RoomThresholdCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RoomThresholdCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>[]
          }
          delete: {
            args: Prisma.RoomThresholdDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>
          }
          update: {
            args: Prisma.RoomThresholdUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>
          }
          deleteMany: {
            args: Prisma.RoomThresholdDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RoomThresholdUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RoomThresholdUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>[]
          }
          upsert: {
            args: Prisma.RoomThresholdUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoomThresholdPayload>
          }
          aggregate: {
            args: Prisma.RoomThresholdAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRoomThreshold>
          }
          groupBy: {
            args: Prisma.RoomThresholdGroupByArgs<ExtArgs>
            result: $Utils.Optional<RoomThresholdGroupByOutputType>[]
          }
          count: {
            args: Prisma.RoomThresholdCountArgs<ExtArgs>
            result: $Utils.Optional<RoomThresholdCountAggregateOutputType> | number
          }
        }
      }
      PendingAlert: {
        payload: Prisma.$PendingAlertPayload<ExtArgs>
        fields: Prisma.PendingAlertFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PendingAlertFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PendingAlertFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>
          }
          findFirst: {
            args: Prisma.PendingAlertFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PendingAlertFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>
          }
          findMany: {
            args: Prisma.PendingAlertFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>[]
          }
          create: {
            args: Prisma.PendingAlertCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>
          }
          createMany: {
            args: Prisma.PendingAlertCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PendingAlertCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>[]
          }
          delete: {
            args: Prisma.PendingAlertDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>
          }
          update: {
            args: Prisma.PendingAlertUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>
          }
          deleteMany: {
            args: Prisma.PendingAlertDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PendingAlertUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PendingAlertUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>[]
          }
          upsert: {
            args: Prisma.PendingAlertUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PendingAlertPayload>
          }
          aggregate: {
            args: Prisma.PendingAlertAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePendingAlert>
          }
          groupBy: {
            args: Prisma.PendingAlertGroupByArgs<ExtArgs>
            result: $Utils.Optional<PendingAlertGroupByOutputType>[]
          }
          count: {
            args: Prisma.PendingAlertCountArgs<ExtArgs>
            result: $Utils.Optional<PendingAlertCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    device?: DeviceOmit
    cameraLatest?: CameraLatestOmit
    sensorReading?: SensorReadingOmit
    roomThreshold?: RoomThresholdOmit
    pendingAlert?: PendingAlertOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type DeviceCountOutputType
   */

  export type DeviceCountOutputType = {
    readings: number
  }

  export type DeviceCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    readings?: boolean | DeviceCountOutputTypeCountReadingsArgs
  }

  // Custom InputTypes
  /**
   * DeviceCountOutputType without action
   */
  export type DeviceCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceCountOutputType
     */
    select?: DeviceCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * DeviceCountOutputType without action
   */
  export type DeviceCountOutputTypeCountReadingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SensorReadingWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Device
   */

  export type AggregateDevice = {
    _count: DeviceCountAggregateOutputType | null
    _avg: DeviceAvgAggregateOutputType | null
    _sum: DeviceSumAggregateOutputType | null
    _min: DeviceMinAggregateOutputType | null
    _max: DeviceMaxAggregateOutputType | null
  }

  export type DeviceAvgAggregateOutputType = {
    intervalSec: number | null
  }

  export type DeviceSumAggregateOutputType = {
    intervalSec: number | null
  }

  export type DeviceMinAggregateOutputType = {
    id: string | null
    roomId: string | null
    type: $Enums.DeviceType | null
    name: string | null
    apiKeyHash: string | null
    intervalSec: number | null
    isSimulated: boolean | null
    status: $Enums.DeviceStatus | null
    connectionState: $Enums.ConnectionState | null
    lastSeen: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type DeviceMaxAggregateOutputType = {
    id: string | null
    roomId: string | null
    type: $Enums.DeviceType | null
    name: string | null
    apiKeyHash: string | null
    intervalSec: number | null
    isSimulated: boolean | null
    status: $Enums.DeviceStatus | null
    connectionState: $Enums.ConnectionState | null
    lastSeen: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type DeviceCountAggregateOutputType = {
    id: number
    roomId: number
    type: number
    name: number
    apiKeyHash: number
    intervalSec: number
    isSimulated: number
    status: number
    connectionState: number
    lastSeen: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type DeviceAvgAggregateInputType = {
    intervalSec?: true
  }

  export type DeviceSumAggregateInputType = {
    intervalSec?: true
  }

  export type DeviceMinAggregateInputType = {
    id?: true
    roomId?: true
    type?: true
    name?: true
    apiKeyHash?: true
    intervalSec?: true
    isSimulated?: true
    status?: true
    connectionState?: true
    lastSeen?: true
    createdAt?: true
    updatedAt?: true
  }

  export type DeviceMaxAggregateInputType = {
    id?: true
    roomId?: true
    type?: true
    name?: true
    apiKeyHash?: true
    intervalSec?: true
    isSimulated?: true
    status?: true
    connectionState?: true
    lastSeen?: true
    createdAt?: true
    updatedAt?: true
  }

  export type DeviceCountAggregateInputType = {
    id?: true
    roomId?: true
    type?: true
    name?: true
    apiKeyHash?: true
    intervalSec?: true
    isSimulated?: true
    status?: true
    connectionState?: true
    lastSeen?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type DeviceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Device to aggregate.
     */
    where?: DeviceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Devices to fetch.
     */
    orderBy?: DeviceOrderByWithRelationInput | DeviceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DeviceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Devices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Devices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Devices
    **/
    _count?: true | DeviceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DeviceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DeviceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DeviceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DeviceMaxAggregateInputType
  }

  export type GetDeviceAggregateType<T extends DeviceAggregateArgs> = {
        [P in keyof T & keyof AggregateDevice]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDevice[P]>
      : GetScalarType<T[P], AggregateDevice[P]>
  }




  export type DeviceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DeviceWhereInput
    orderBy?: DeviceOrderByWithAggregationInput | DeviceOrderByWithAggregationInput[]
    by: DeviceScalarFieldEnum[] | DeviceScalarFieldEnum
    having?: DeviceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DeviceCountAggregateInputType | true
    _avg?: DeviceAvgAggregateInputType
    _sum?: DeviceSumAggregateInputType
    _min?: DeviceMinAggregateInputType
    _max?: DeviceMaxAggregateInputType
  }

  export type DeviceGroupByOutputType = {
    id: string
    roomId: string
    type: $Enums.DeviceType
    name: string
    apiKeyHash: string
    intervalSec: number
    isSimulated: boolean
    status: $Enums.DeviceStatus
    connectionState: $Enums.ConnectionState
    lastSeen: Date | null
    createdAt: Date
    updatedAt: Date
    _count: DeviceCountAggregateOutputType | null
    _avg: DeviceAvgAggregateOutputType | null
    _sum: DeviceSumAggregateOutputType | null
    _min: DeviceMinAggregateOutputType | null
    _max: DeviceMaxAggregateOutputType | null
  }

  type GetDeviceGroupByPayload<T extends DeviceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DeviceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DeviceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DeviceGroupByOutputType[P]>
            : GetScalarType<T[P], DeviceGroupByOutputType[P]>
        }
      >
    >


  export type DeviceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    type?: boolean
    name?: boolean
    apiKeyHash?: boolean
    intervalSec?: boolean
    isSimulated?: boolean
    status?: boolean
    connectionState?: boolean
    lastSeen?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    cameraLatest?: boolean | Device$cameraLatestArgs<ExtArgs>
    readings?: boolean | Device$readingsArgs<ExtArgs>
    _count?: boolean | DeviceCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["device"]>

  export type DeviceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    type?: boolean
    name?: boolean
    apiKeyHash?: boolean
    intervalSec?: boolean
    isSimulated?: boolean
    status?: boolean
    connectionState?: boolean
    lastSeen?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["device"]>

  export type DeviceSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    roomId?: boolean
    type?: boolean
    name?: boolean
    apiKeyHash?: boolean
    intervalSec?: boolean
    isSimulated?: boolean
    status?: boolean
    connectionState?: boolean
    lastSeen?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["device"]>

  export type DeviceSelectScalar = {
    id?: boolean
    roomId?: boolean
    type?: boolean
    name?: boolean
    apiKeyHash?: boolean
    intervalSec?: boolean
    isSimulated?: boolean
    status?: boolean
    connectionState?: boolean
    lastSeen?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type DeviceOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "roomId" | "type" | "name" | "apiKeyHash" | "intervalSec" | "isSimulated" | "status" | "connectionState" | "lastSeen" | "createdAt" | "updatedAt", ExtArgs["result"]["device"]>
  export type DeviceInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cameraLatest?: boolean | Device$cameraLatestArgs<ExtArgs>
    readings?: boolean | Device$readingsArgs<ExtArgs>
    _count?: boolean | DeviceCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type DeviceIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type DeviceIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $DevicePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Device"
    objects: {
      cameraLatest: Prisma.$CameraLatestPayload<ExtArgs> | null
      readings: Prisma.$SensorReadingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      roomId: string
      type: $Enums.DeviceType
      name: string
      apiKeyHash: string
      intervalSec: number
      isSimulated: boolean
      status: $Enums.DeviceStatus
      connectionState: $Enums.ConnectionState
      lastSeen: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["device"]>
    composites: {}
  }

  type DeviceGetPayload<S extends boolean | null | undefined | DeviceDefaultArgs> = $Result.GetResult<Prisma.$DevicePayload, S>

  type DeviceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DeviceFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DeviceCountAggregateInputType | true
    }

  export interface DeviceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Device'], meta: { name: 'Device' } }
    /**
     * Find zero or one Device that matches the filter.
     * @param {DeviceFindUniqueArgs} args - Arguments to find a Device
     * @example
     * // Get one Device
     * const device = await prisma.device.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DeviceFindUniqueArgs>(args: SelectSubset<T, DeviceFindUniqueArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Device that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DeviceFindUniqueOrThrowArgs} args - Arguments to find a Device
     * @example
     * // Get one Device
     * const device = await prisma.device.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DeviceFindUniqueOrThrowArgs>(args: SelectSubset<T, DeviceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Device that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceFindFirstArgs} args - Arguments to find a Device
     * @example
     * // Get one Device
     * const device = await prisma.device.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DeviceFindFirstArgs>(args?: SelectSubset<T, DeviceFindFirstArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Device that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceFindFirstOrThrowArgs} args - Arguments to find a Device
     * @example
     * // Get one Device
     * const device = await prisma.device.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DeviceFindFirstOrThrowArgs>(args?: SelectSubset<T, DeviceFindFirstOrThrowArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Devices that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Devices
     * const devices = await prisma.device.findMany()
     * 
     * // Get first 10 Devices
     * const devices = await prisma.device.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const deviceWithIdOnly = await prisma.device.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DeviceFindManyArgs>(args?: SelectSubset<T, DeviceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Device.
     * @param {DeviceCreateArgs} args - Arguments to create a Device.
     * @example
     * // Create one Device
     * const Device = await prisma.device.create({
     *   data: {
     *     // ... data to create a Device
     *   }
     * })
     * 
     */
    create<T extends DeviceCreateArgs>(args: SelectSubset<T, DeviceCreateArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Devices.
     * @param {DeviceCreateManyArgs} args - Arguments to create many Devices.
     * @example
     * // Create many Devices
     * const device = await prisma.device.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DeviceCreateManyArgs>(args?: SelectSubset<T, DeviceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Devices and returns the data saved in the database.
     * @param {DeviceCreateManyAndReturnArgs} args - Arguments to create many Devices.
     * @example
     * // Create many Devices
     * const device = await prisma.device.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Devices and only return the `id`
     * const deviceWithIdOnly = await prisma.device.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DeviceCreateManyAndReturnArgs>(args?: SelectSubset<T, DeviceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Device.
     * @param {DeviceDeleteArgs} args - Arguments to delete one Device.
     * @example
     * // Delete one Device
     * const Device = await prisma.device.delete({
     *   where: {
     *     // ... filter to delete one Device
     *   }
     * })
     * 
     */
    delete<T extends DeviceDeleteArgs>(args: SelectSubset<T, DeviceDeleteArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Device.
     * @param {DeviceUpdateArgs} args - Arguments to update one Device.
     * @example
     * // Update one Device
     * const device = await prisma.device.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DeviceUpdateArgs>(args: SelectSubset<T, DeviceUpdateArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Devices.
     * @param {DeviceDeleteManyArgs} args - Arguments to filter Devices to delete.
     * @example
     * // Delete a few Devices
     * const { count } = await prisma.device.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DeviceDeleteManyArgs>(args?: SelectSubset<T, DeviceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Devices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Devices
     * const device = await prisma.device.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DeviceUpdateManyArgs>(args: SelectSubset<T, DeviceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Devices and returns the data updated in the database.
     * @param {DeviceUpdateManyAndReturnArgs} args - Arguments to update many Devices.
     * @example
     * // Update many Devices
     * const device = await prisma.device.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Devices and only return the `id`
     * const deviceWithIdOnly = await prisma.device.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DeviceUpdateManyAndReturnArgs>(args: SelectSubset<T, DeviceUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Device.
     * @param {DeviceUpsertArgs} args - Arguments to update or create a Device.
     * @example
     * // Update or create a Device
     * const device = await prisma.device.upsert({
     *   create: {
     *     // ... data to create a Device
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Device we want to update
     *   }
     * })
     */
    upsert<T extends DeviceUpsertArgs>(args: SelectSubset<T, DeviceUpsertArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Devices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceCountArgs} args - Arguments to filter Devices to count.
     * @example
     * // Count the number of Devices
     * const count = await prisma.device.count({
     *   where: {
     *     // ... the filter for the Devices we want to count
     *   }
     * })
    **/
    count<T extends DeviceCountArgs>(
      args?: Subset<T, DeviceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DeviceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Device.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DeviceAggregateArgs>(args: Subset<T, DeviceAggregateArgs>): Prisma.PrismaPromise<GetDeviceAggregateType<T>>

    /**
     * Group by Device.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DeviceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DeviceGroupByArgs['orderBy'] }
        : { orderBy?: DeviceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DeviceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDeviceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Device model
   */
  readonly fields: DeviceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Device.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DeviceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cameraLatest<T extends Device$cameraLatestArgs<ExtArgs> = {}>(args?: Subset<T, Device$cameraLatestArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    readings<T extends Device$readingsArgs<ExtArgs> = {}>(args?: Subset<T, Device$readingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Device model
   */
  interface DeviceFieldRefs {
    readonly id: FieldRef<"Device", 'String'>
    readonly roomId: FieldRef<"Device", 'String'>
    readonly type: FieldRef<"Device", 'DeviceType'>
    readonly name: FieldRef<"Device", 'String'>
    readonly apiKeyHash: FieldRef<"Device", 'String'>
    readonly intervalSec: FieldRef<"Device", 'Int'>
    readonly isSimulated: FieldRef<"Device", 'Boolean'>
    readonly status: FieldRef<"Device", 'DeviceStatus'>
    readonly connectionState: FieldRef<"Device", 'ConnectionState'>
    readonly lastSeen: FieldRef<"Device", 'DateTime'>
    readonly createdAt: FieldRef<"Device", 'DateTime'>
    readonly updatedAt: FieldRef<"Device", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Device findUnique
   */
  export type DeviceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * Filter, which Device to fetch.
     */
    where: DeviceWhereUniqueInput
  }

  /**
   * Device findUniqueOrThrow
   */
  export type DeviceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * Filter, which Device to fetch.
     */
    where: DeviceWhereUniqueInput
  }

  /**
   * Device findFirst
   */
  export type DeviceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * Filter, which Device to fetch.
     */
    where?: DeviceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Devices to fetch.
     */
    orderBy?: DeviceOrderByWithRelationInput | DeviceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Devices.
     */
    cursor?: DeviceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Devices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Devices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Devices.
     */
    distinct?: DeviceScalarFieldEnum | DeviceScalarFieldEnum[]
  }

  /**
   * Device findFirstOrThrow
   */
  export type DeviceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * Filter, which Device to fetch.
     */
    where?: DeviceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Devices to fetch.
     */
    orderBy?: DeviceOrderByWithRelationInput | DeviceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Devices.
     */
    cursor?: DeviceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Devices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Devices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Devices.
     */
    distinct?: DeviceScalarFieldEnum | DeviceScalarFieldEnum[]
  }

  /**
   * Device findMany
   */
  export type DeviceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * Filter, which Devices to fetch.
     */
    where?: DeviceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Devices to fetch.
     */
    orderBy?: DeviceOrderByWithRelationInput | DeviceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Devices.
     */
    cursor?: DeviceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Devices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Devices.
     */
    skip?: number
    distinct?: DeviceScalarFieldEnum | DeviceScalarFieldEnum[]
  }

  /**
   * Device create
   */
  export type DeviceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * The data needed to create a Device.
     */
    data: XOR<DeviceCreateInput, DeviceUncheckedCreateInput>
  }

  /**
   * Device createMany
   */
  export type DeviceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Devices.
     */
    data: DeviceCreateManyInput | DeviceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Device createManyAndReturn
   */
  export type DeviceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * The data used to create many Devices.
     */
    data: DeviceCreateManyInput | DeviceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Device update
   */
  export type DeviceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * The data needed to update a Device.
     */
    data: XOR<DeviceUpdateInput, DeviceUncheckedUpdateInput>
    /**
     * Choose, which Device to update.
     */
    where: DeviceWhereUniqueInput
  }

  /**
   * Device updateMany
   */
  export type DeviceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Devices.
     */
    data: XOR<DeviceUpdateManyMutationInput, DeviceUncheckedUpdateManyInput>
    /**
     * Filter which Devices to update
     */
    where?: DeviceWhereInput
    /**
     * Limit how many Devices to update.
     */
    limit?: number
  }

  /**
   * Device updateManyAndReturn
   */
  export type DeviceUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * The data used to update Devices.
     */
    data: XOR<DeviceUpdateManyMutationInput, DeviceUncheckedUpdateManyInput>
    /**
     * Filter which Devices to update
     */
    where?: DeviceWhereInput
    /**
     * Limit how many Devices to update.
     */
    limit?: number
  }

  /**
   * Device upsert
   */
  export type DeviceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * The filter to search for the Device to update in case it exists.
     */
    where: DeviceWhereUniqueInput
    /**
     * In case the Device found by the `where` argument doesn't exist, create a new Device with this data.
     */
    create: XOR<DeviceCreateInput, DeviceUncheckedCreateInput>
    /**
     * In case the Device was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DeviceUpdateInput, DeviceUncheckedUpdateInput>
  }

  /**
   * Device delete
   */
  export type DeviceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
    /**
     * Filter which Device to delete.
     */
    where: DeviceWhereUniqueInput
  }

  /**
   * Device deleteMany
   */
  export type DeviceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Devices to delete
     */
    where?: DeviceWhereInput
    /**
     * Limit how many Devices to delete.
     */
    limit?: number
  }

  /**
   * Device.cameraLatest
   */
  export type Device$cameraLatestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    where?: CameraLatestWhereInput
  }

  /**
   * Device.readings
   */
  export type Device$readingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    where?: SensorReadingWhereInput
    orderBy?: SensorReadingOrderByWithRelationInput | SensorReadingOrderByWithRelationInput[]
    cursor?: SensorReadingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SensorReadingScalarFieldEnum | SensorReadingScalarFieldEnum[]
  }

  /**
   * Device without action
   */
  export type DeviceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Device
     */
    select?: DeviceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Device
     */
    omit?: DeviceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceInclude<ExtArgs> | null
  }


  /**
   * Model CameraLatest
   */

  export type AggregateCameraLatest = {
    _count: CameraLatestCountAggregateOutputType | null
    _min: CameraLatestMinAggregateOutputType | null
    _max: CameraLatestMaxAggregateOutputType | null
  }

  export type CameraLatestMinAggregateOutputType = {
    deviceId: string | null
    image: Bytes | null
    capturedAt: Date | null
    updatedAt: Date | null
  }

  export type CameraLatestMaxAggregateOutputType = {
    deviceId: string | null
    image: Bytes | null
    capturedAt: Date | null
    updatedAt: Date | null
  }

  export type CameraLatestCountAggregateOutputType = {
    deviceId: number
    image: number
    capturedAt: number
    updatedAt: number
    _all: number
  }


  export type CameraLatestMinAggregateInputType = {
    deviceId?: true
    image?: true
    capturedAt?: true
    updatedAt?: true
  }

  export type CameraLatestMaxAggregateInputType = {
    deviceId?: true
    image?: true
    capturedAt?: true
    updatedAt?: true
  }

  export type CameraLatestCountAggregateInputType = {
    deviceId?: true
    image?: true
    capturedAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CameraLatestAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CameraLatest to aggregate.
     */
    where?: CameraLatestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CameraLatests to fetch.
     */
    orderBy?: CameraLatestOrderByWithRelationInput | CameraLatestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CameraLatestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CameraLatests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CameraLatests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CameraLatests
    **/
    _count?: true | CameraLatestCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CameraLatestMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CameraLatestMaxAggregateInputType
  }

  export type GetCameraLatestAggregateType<T extends CameraLatestAggregateArgs> = {
        [P in keyof T & keyof AggregateCameraLatest]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCameraLatest[P]>
      : GetScalarType<T[P], AggregateCameraLatest[P]>
  }




  export type CameraLatestGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CameraLatestWhereInput
    orderBy?: CameraLatestOrderByWithAggregationInput | CameraLatestOrderByWithAggregationInput[]
    by: CameraLatestScalarFieldEnum[] | CameraLatestScalarFieldEnum
    having?: CameraLatestScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CameraLatestCountAggregateInputType | true
    _min?: CameraLatestMinAggregateInputType
    _max?: CameraLatestMaxAggregateInputType
  }

  export type CameraLatestGroupByOutputType = {
    deviceId: string
    image: Bytes
    capturedAt: Date
    updatedAt: Date
    _count: CameraLatestCountAggregateOutputType | null
    _min: CameraLatestMinAggregateOutputType | null
    _max: CameraLatestMaxAggregateOutputType | null
  }

  type GetCameraLatestGroupByPayload<T extends CameraLatestGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CameraLatestGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CameraLatestGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CameraLatestGroupByOutputType[P]>
            : GetScalarType<T[P], CameraLatestGroupByOutputType[P]>
        }
      >
    >


  export type CameraLatestSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    deviceId?: boolean
    image?: boolean
    capturedAt?: boolean
    updatedAt?: boolean
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cameraLatest"]>

  export type CameraLatestSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    deviceId?: boolean
    image?: boolean
    capturedAt?: boolean
    updatedAt?: boolean
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cameraLatest"]>

  export type CameraLatestSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    deviceId?: boolean
    image?: boolean
    capturedAt?: boolean
    updatedAt?: boolean
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cameraLatest"]>

  export type CameraLatestSelectScalar = {
    deviceId?: boolean
    image?: boolean
    capturedAt?: boolean
    updatedAt?: boolean
  }

  export type CameraLatestOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"deviceId" | "image" | "capturedAt" | "updatedAt", ExtArgs["result"]["cameraLatest"]>
  export type CameraLatestInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }
  export type CameraLatestIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }
  export type CameraLatestIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }

  export type $CameraLatestPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CameraLatest"
    objects: {
      device: Prisma.$DevicePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      deviceId: string
      image: Prisma.Bytes
      capturedAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["cameraLatest"]>
    composites: {}
  }

  type CameraLatestGetPayload<S extends boolean | null | undefined | CameraLatestDefaultArgs> = $Result.GetResult<Prisma.$CameraLatestPayload, S>

  type CameraLatestCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CameraLatestFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CameraLatestCountAggregateInputType | true
    }

  export interface CameraLatestDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CameraLatest'], meta: { name: 'CameraLatest' } }
    /**
     * Find zero or one CameraLatest that matches the filter.
     * @param {CameraLatestFindUniqueArgs} args - Arguments to find a CameraLatest
     * @example
     * // Get one CameraLatest
     * const cameraLatest = await prisma.cameraLatest.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CameraLatestFindUniqueArgs>(args: SelectSubset<T, CameraLatestFindUniqueArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CameraLatest that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CameraLatestFindUniqueOrThrowArgs} args - Arguments to find a CameraLatest
     * @example
     * // Get one CameraLatest
     * const cameraLatest = await prisma.cameraLatest.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CameraLatestFindUniqueOrThrowArgs>(args: SelectSubset<T, CameraLatestFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CameraLatest that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CameraLatestFindFirstArgs} args - Arguments to find a CameraLatest
     * @example
     * // Get one CameraLatest
     * const cameraLatest = await prisma.cameraLatest.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CameraLatestFindFirstArgs>(args?: SelectSubset<T, CameraLatestFindFirstArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CameraLatest that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CameraLatestFindFirstOrThrowArgs} args - Arguments to find a CameraLatest
     * @example
     * // Get one CameraLatest
     * const cameraLatest = await prisma.cameraLatest.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CameraLatestFindFirstOrThrowArgs>(args?: SelectSubset<T, CameraLatestFindFirstOrThrowArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CameraLatests that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CameraLatestFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CameraLatests
     * const cameraLatests = await prisma.cameraLatest.findMany()
     * 
     * // Get first 10 CameraLatests
     * const cameraLatests = await prisma.cameraLatest.findMany({ take: 10 })
     * 
     * // Only select the `deviceId`
     * const cameraLatestWithDeviceIdOnly = await prisma.cameraLatest.findMany({ select: { deviceId: true } })
     * 
     */
    findMany<T extends CameraLatestFindManyArgs>(args?: SelectSubset<T, CameraLatestFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CameraLatest.
     * @param {CameraLatestCreateArgs} args - Arguments to create a CameraLatest.
     * @example
     * // Create one CameraLatest
     * const CameraLatest = await prisma.cameraLatest.create({
     *   data: {
     *     // ... data to create a CameraLatest
     *   }
     * })
     * 
     */
    create<T extends CameraLatestCreateArgs>(args: SelectSubset<T, CameraLatestCreateArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CameraLatests.
     * @param {CameraLatestCreateManyArgs} args - Arguments to create many CameraLatests.
     * @example
     * // Create many CameraLatests
     * const cameraLatest = await prisma.cameraLatest.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CameraLatestCreateManyArgs>(args?: SelectSubset<T, CameraLatestCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CameraLatests and returns the data saved in the database.
     * @param {CameraLatestCreateManyAndReturnArgs} args - Arguments to create many CameraLatests.
     * @example
     * // Create many CameraLatests
     * const cameraLatest = await prisma.cameraLatest.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CameraLatests and only return the `deviceId`
     * const cameraLatestWithDeviceIdOnly = await prisma.cameraLatest.createManyAndReturn({
     *   select: { deviceId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CameraLatestCreateManyAndReturnArgs>(args?: SelectSubset<T, CameraLatestCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CameraLatest.
     * @param {CameraLatestDeleteArgs} args - Arguments to delete one CameraLatest.
     * @example
     * // Delete one CameraLatest
     * const CameraLatest = await prisma.cameraLatest.delete({
     *   where: {
     *     // ... filter to delete one CameraLatest
     *   }
     * })
     * 
     */
    delete<T extends CameraLatestDeleteArgs>(args: SelectSubset<T, CameraLatestDeleteArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CameraLatest.
     * @param {CameraLatestUpdateArgs} args - Arguments to update one CameraLatest.
     * @example
     * // Update one CameraLatest
     * const cameraLatest = await prisma.cameraLatest.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CameraLatestUpdateArgs>(args: SelectSubset<T, CameraLatestUpdateArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CameraLatests.
     * @param {CameraLatestDeleteManyArgs} args - Arguments to filter CameraLatests to delete.
     * @example
     * // Delete a few CameraLatests
     * const { count } = await prisma.cameraLatest.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CameraLatestDeleteManyArgs>(args?: SelectSubset<T, CameraLatestDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CameraLatests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CameraLatestUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CameraLatests
     * const cameraLatest = await prisma.cameraLatest.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CameraLatestUpdateManyArgs>(args: SelectSubset<T, CameraLatestUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CameraLatests and returns the data updated in the database.
     * @param {CameraLatestUpdateManyAndReturnArgs} args - Arguments to update many CameraLatests.
     * @example
     * // Update many CameraLatests
     * const cameraLatest = await prisma.cameraLatest.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CameraLatests and only return the `deviceId`
     * const cameraLatestWithDeviceIdOnly = await prisma.cameraLatest.updateManyAndReturn({
     *   select: { deviceId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CameraLatestUpdateManyAndReturnArgs>(args: SelectSubset<T, CameraLatestUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CameraLatest.
     * @param {CameraLatestUpsertArgs} args - Arguments to update or create a CameraLatest.
     * @example
     * // Update or create a CameraLatest
     * const cameraLatest = await prisma.cameraLatest.upsert({
     *   create: {
     *     // ... data to create a CameraLatest
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CameraLatest we want to update
     *   }
     * })
     */
    upsert<T extends CameraLatestUpsertArgs>(args: SelectSubset<T, CameraLatestUpsertArgs<ExtArgs>>): Prisma__CameraLatestClient<$Result.GetResult<Prisma.$CameraLatestPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CameraLatests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CameraLatestCountArgs} args - Arguments to filter CameraLatests to count.
     * @example
     * // Count the number of CameraLatests
     * const count = await prisma.cameraLatest.count({
     *   where: {
     *     // ... the filter for the CameraLatests we want to count
     *   }
     * })
    **/
    count<T extends CameraLatestCountArgs>(
      args?: Subset<T, CameraLatestCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CameraLatestCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CameraLatest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CameraLatestAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CameraLatestAggregateArgs>(args: Subset<T, CameraLatestAggregateArgs>): Prisma.PrismaPromise<GetCameraLatestAggregateType<T>>

    /**
     * Group by CameraLatest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CameraLatestGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CameraLatestGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CameraLatestGroupByArgs['orderBy'] }
        : { orderBy?: CameraLatestGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CameraLatestGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCameraLatestGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CameraLatest model
   */
  readonly fields: CameraLatestFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CameraLatest.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CameraLatestClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    device<T extends DeviceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, DeviceDefaultArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CameraLatest model
   */
  interface CameraLatestFieldRefs {
    readonly deviceId: FieldRef<"CameraLatest", 'String'>
    readonly image: FieldRef<"CameraLatest", 'Bytes'>
    readonly capturedAt: FieldRef<"CameraLatest", 'DateTime'>
    readonly updatedAt: FieldRef<"CameraLatest", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CameraLatest findUnique
   */
  export type CameraLatestFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * Filter, which CameraLatest to fetch.
     */
    where: CameraLatestWhereUniqueInput
  }

  /**
   * CameraLatest findUniqueOrThrow
   */
  export type CameraLatestFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * Filter, which CameraLatest to fetch.
     */
    where: CameraLatestWhereUniqueInput
  }

  /**
   * CameraLatest findFirst
   */
  export type CameraLatestFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * Filter, which CameraLatest to fetch.
     */
    where?: CameraLatestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CameraLatests to fetch.
     */
    orderBy?: CameraLatestOrderByWithRelationInput | CameraLatestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CameraLatests.
     */
    cursor?: CameraLatestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CameraLatests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CameraLatests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CameraLatests.
     */
    distinct?: CameraLatestScalarFieldEnum | CameraLatestScalarFieldEnum[]
  }

  /**
   * CameraLatest findFirstOrThrow
   */
  export type CameraLatestFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * Filter, which CameraLatest to fetch.
     */
    where?: CameraLatestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CameraLatests to fetch.
     */
    orderBy?: CameraLatestOrderByWithRelationInput | CameraLatestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CameraLatests.
     */
    cursor?: CameraLatestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CameraLatests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CameraLatests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CameraLatests.
     */
    distinct?: CameraLatestScalarFieldEnum | CameraLatestScalarFieldEnum[]
  }

  /**
   * CameraLatest findMany
   */
  export type CameraLatestFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * Filter, which CameraLatests to fetch.
     */
    where?: CameraLatestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CameraLatests to fetch.
     */
    orderBy?: CameraLatestOrderByWithRelationInput | CameraLatestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CameraLatests.
     */
    cursor?: CameraLatestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CameraLatests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CameraLatests.
     */
    skip?: number
    distinct?: CameraLatestScalarFieldEnum | CameraLatestScalarFieldEnum[]
  }

  /**
   * CameraLatest create
   */
  export type CameraLatestCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * The data needed to create a CameraLatest.
     */
    data: XOR<CameraLatestCreateInput, CameraLatestUncheckedCreateInput>
  }

  /**
   * CameraLatest createMany
   */
  export type CameraLatestCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CameraLatests.
     */
    data: CameraLatestCreateManyInput | CameraLatestCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CameraLatest createManyAndReturn
   */
  export type CameraLatestCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * The data used to create many CameraLatests.
     */
    data: CameraLatestCreateManyInput | CameraLatestCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CameraLatest update
   */
  export type CameraLatestUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * The data needed to update a CameraLatest.
     */
    data: XOR<CameraLatestUpdateInput, CameraLatestUncheckedUpdateInput>
    /**
     * Choose, which CameraLatest to update.
     */
    where: CameraLatestWhereUniqueInput
  }

  /**
   * CameraLatest updateMany
   */
  export type CameraLatestUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CameraLatests.
     */
    data: XOR<CameraLatestUpdateManyMutationInput, CameraLatestUncheckedUpdateManyInput>
    /**
     * Filter which CameraLatests to update
     */
    where?: CameraLatestWhereInput
    /**
     * Limit how many CameraLatests to update.
     */
    limit?: number
  }

  /**
   * CameraLatest updateManyAndReturn
   */
  export type CameraLatestUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * The data used to update CameraLatests.
     */
    data: XOR<CameraLatestUpdateManyMutationInput, CameraLatestUncheckedUpdateManyInput>
    /**
     * Filter which CameraLatests to update
     */
    where?: CameraLatestWhereInput
    /**
     * Limit how many CameraLatests to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CameraLatest upsert
   */
  export type CameraLatestUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * The filter to search for the CameraLatest to update in case it exists.
     */
    where: CameraLatestWhereUniqueInput
    /**
     * In case the CameraLatest found by the `where` argument doesn't exist, create a new CameraLatest with this data.
     */
    create: XOR<CameraLatestCreateInput, CameraLatestUncheckedCreateInput>
    /**
     * In case the CameraLatest was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CameraLatestUpdateInput, CameraLatestUncheckedUpdateInput>
  }

  /**
   * CameraLatest delete
   */
  export type CameraLatestDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
    /**
     * Filter which CameraLatest to delete.
     */
    where: CameraLatestWhereUniqueInput
  }

  /**
   * CameraLatest deleteMany
   */
  export type CameraLatestDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CameraLatests to delete
     */
    where?: CameraLatestWhereInput
    /**
     * Limit how many CameraLatests to delete.
     */
    limit?: number
  }

  /**
   * CameraLatest without action
   */
  export type CameraLatestDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CameraLatest
     */
    select?: CameraLatestSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CameraLatest
     */
    omit?: CameraLatestOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CameraLatestInclude<ExtArgs> | null
  }


  /**
   * Model SensorReading
   */

  export type AggregateSensorReading = {
    _count: SensorReadingCountAggregateOutputType | null
    _avg: SensorReadingAvgAggregateOutputType | null
    _sum: SensorReadingSumAggregateOutputType | null
    _min: SensorReadingMinAggregateOutputType | null
    _max: SensorReadingMaxAggregateOutputType | null
  }

  export type SensorReadingAvgAggregateOutputType = {
    id: number | null
    temperature: number | null
    humidity: number | null
  }

  export type SensorReadingSumAggregateOutputType = {
    id: bigint | null
    temperature: number | null
    humidity: number | null
  }

  export type SensorReadingMinAggregateOutputType = {
    id: bigint | null
    deviceId: string | null
    roomId: string | null
    temperature: number | null
    humidity: number | null
    recordedAt: Date | null
  }

  export type SensorReadingMaxAggregateOutputType = {
    id: bigint | null
    deviceId: string | null
    roomId: string | null
    temperature: number | null
    humidity: number | null
    recordedAt: Date | null
  }

  export type SensorReadingCountAggregateOutputType = {
    id: number
    deviceId: number
    roomId: number
    temperature: number
    humidity: number
    recordedAt: number
    _all: number
  }


  export type SensorReadingAvgAggregateInputType = {
    id?: true
    temperature?: true
    humidity?: true
  }

  export type SensorReadingSumAggregateInputType = {
    id?: true
    temperature?: true
    humidity?: true
  }

  export type SensorReadingMinAggregateInputType = {
    id?: true
    deviceId?: true
    roomId?: true
    temperature?: true
    humidity?: true
    recordedAt?: true
  }

  export type SensorReadingMaxAggregateInputType = {
    id?: true
    deviceId?: true
    roomId?: true
    temperature?: true
    humidity?: true
    recordedAt?: true
  }

  export type SensorReadingCountAggregateInputType = {
    id?: true
    deviceId?: true
    roomId?: true
    temperature?: true
    humidity?: true
    recordedAt?: true
    _all?: true
  }

  export type SensorReadingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SensorReading to aggregate.
     */
    where?: SensorReadingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SensorReadings to fetch.
     */
    orderBy?: SensorReadingOrderByWithRelationInput | SensorReadingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SensorReadingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SensorReadings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SensorReadings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SensorReadings
    **/
    _count?: true | SensorReadingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SensorReadingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SensorReadingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SensorReadingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SensorReadingMaxAggregateInputType
  }

  export type GetSensorReadingAggregateType<T extends SensorReadingAggregateArgs> = {
        [P in keyof T & keyof AggregateSensorReading]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSensorReading[P]>
      : GetScalarType<T[P], AggregateSensorReading[P]>
  }




  export type SensorReadingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SensorReadingWhereInput
    orderBy?: SensorReadingOrderByWithAggregationInput | SensorReadingOrderByWithAggregationInput[]
    by: SensorReadingScalarFieldEnum[] | SensorReadingScalarFieldEnum
    having?: SensorReadingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SensorReadingCountAggregateInputType | true
    _avg?: SensorReadingAvgAggregateInputType
    _sum?: SensorReadingSumAggregateInputType
    _min?: SensorReadingMinAggregateInputType
    _max?: SensorReadingMaxAggregateInputType
  }

  export type SensorReadingGroupByOutputType = {
    id: bigint
    deviceId: string
    roomId: string
    temperature: number
    humidity: number
    recordedAt: Date
    _count: SensorReadingCountAggregateOutputType | null
    _avg: SensorReadingAvgAggregateOutputType | null
    _sum: SensorReadingSumAggregateOutputType | null
    _min: SensorReadingMinAggregateOutputType | null
    _max: SensorReadingMaxAggregateOutputType | null
  }

  type GetSensorReadingGroupByPayload<T extends SensorReadingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SensorReadingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SensorReadingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SensorReadingGroupByOutputType[P]>
            : GetScalarType<T[P], SensorReadingGroupByOutputType[P]>
        }
      >
    >


  export type SensorReadingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    deviceId?: boolean
    roomId?: boolean
    temperature?: boolean
    humidity?: boolean
    recordedAt?: boolean
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["sensorReading"]>

  export type SensorReadingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    deviceId?: boolean
    roomId?: boolean
    temperature?: boolean
    humidity?: boolean
    recordedAt?: boolean
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["sensorReading"]>

  export type SensorReadingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    deviceId?: boolean
    roomId?: boolean
    temperature?: boolean
    humidity?: boolean
    recordedAt?: boolean
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["sensorReading"]>

  export type SensorReadingSelectScalar = {
    id?: boolean
    deviceId?: boolean
    roomId?: boolean
    temperature?: boolean
    humidity?: boolean
    recordedAt?: boolean
  }

  export type SensorReadingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "deviceId" | "roomId" | "temperature" | "humidity" | "recordedAt", ExtArgs["result"]["sensorReading"]>
  export type SensorReadingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }
  export type SensorReadingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }
  export type SensorReadingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    device?: boolean | DeviceDefaultArgs<ExtArgs>
  }

  export type $SensorReadingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SensorReading"
    objects: {
      device: Prisma.$DevicePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      deviceId: string
      roomId: string
      temperature: number
      humidity: number
      recordedAt: Date
    }, ExtArgs["result"]["sensorReading"]>
    composites: {}
  }

  type SensorReadingGetPayload<S extends boolean | null | undefined | SensorReadingDefaultArgs> = $Result.GetResult<Prisma.$SensorReadingPayload, S>

  type SensorReadingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SensorReadingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SensorReadingCountAggregateInputType | true
    }

  export interface SensorReadingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SensorReading'], meta: { name: 'SensorReading' } }
    /**
     * Find zero or one SensorReading that matches the filter.
     * @param {SensorReadingFindUniqueArgs} args - Arguments to find a SensorReading
     * @example
     * // Get one SensorReading
     * const sensorReading = await prisma.sensorReading.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SensorReadingFindUniqueArgs>(args: SelectSubset<T, SensorReadingFindUniqueArgs<ExtArgs>>): Prisma__SensorReadingClient<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SensorReading that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SensorReadingFindUniqueOrThrowArgs} args - Arguments to find a SensorReading
     * @example
     * // Get one SensorReading
     * const sensorReading = await prisma.sensorReading.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SensorReadingFindUniqueOrThrowArgs>(args: SelectSubset<T, SensorReadingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SensorReadingClient<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SensorReading that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SensorReadingFindFirstArgs} args - Arguments to find a SensorReading
     * @example
     * // Get one SensorReading
     * const sensorReading = await prisma.sensorReading.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SensorReadingFindFirstArgs>(args?: SelectSubset<T, SensorReadingFindFirstArgs<ExtArgs>>): Prisma__SensorReadingClient<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SensorReading that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SensorReadingFindFirstOrThrowArgs} args - Arguments to find a SensorReading
     * @example
     * // Get one SensorReading
     * const sensorReading = await prisma.sensorReading.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SensorReadingFindFirstOrThrowArgs>(args?: SelectSubset<T, SensorReadingFindFirstOrThrowArgs<ExtArgs>>): Prisma__SensorReadingClient<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SensorReadings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SensorReadingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SensorReadings
     * const sensorReadings = await prisma.sensorReading.findMany()
     * 
     * // Get first 10 SensorReadings
     * const sensorReadings = await prisma.sensorReading.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sensorReadingWithIdOnly = await prisma.sensorReading.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SensorReadingFindManyArgs>(args?: SelectSubset<T, SensorReadingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SensorReading.
     * @param {SensorReadingCreateArgs} args - Arguments to create a SensorReading.
     * @example
     * // Create one SensorReading
     * const SensorReading = await prisma.sensorReading.create({
     *   data: {
     *     // ... data to create a SensorReading
     *   }
     * })
     * 
     */
    create<T extends SensorReadingCreateArgs>(args: SelectSubset<T, SensorReadingCreateArgs<ExtArgs>>): Prisma__SensorReadingClient<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SensorReadings.
     * @param {SensorReadingCreateManyArgs} args - Arguments to create many SensorReadings.
     * @example
     * // Create many SensorReadings
     * const sensorReading = await prisma.sensorReading.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SensorReadingCreateManyArgs>(args?: SelectSubset<T, SensorReadingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SensorReadings and returns the data saved in the database.
     * @param {SensorReadingCreateManyAndReturnArgs} args - Arguments to create many SensorReadings.
     * @example
     * // Create many SensorReadings
     * const sensorReading = await prisma.sensorReading.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SensorReadings and only return the `id`
     * const sensorReadingWithIdOnly = await prisma.sensorReading.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SensorReadingCreateManyAndReturnArgs>(args?: SelectSubset<T, SensorReadingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SensorReading.
     * @param {SensorReadingDeleteArgs} args - Arguments to delete one SensorReading.
     * @example
     * // Delete one SensorReading
     * const SensorReading = await prisma.sensorReading.delete({
     *   where: {
     *     // ... filter to delete one SensorReading
     *   }
     * })
     * 
     */
    delete<T extends SensorReadingDeleteArgs>(args: SelectSubset<T, SensorReadingDeleteArgs<ExtArgs>>): Prisma__SensorReadingClient<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SensorReading.
     * @param {SensorReadingUpdateArgs} args - Arguments to update one SensorReading.
     * @example
     * // Update one SensorReading
     * const sensorReading = await prisma.sensorReading.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SensorReadingUpdateArgs>(args: SelectSubset<T, SensorReadingUpdateArgs<ExtArgs>>): Prisma__SensorReadingClient<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SensorReadings.
     * @param {SensorReadingDeleteManyArgs} args - Arguments to filter SensorReadings to delete.
     * @example
     * // Delete a few SensorReadings
     * const { count } = await prisma.sensorReading.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SensorReadingDeleteManyArgs>(args?: SelectSubset<T, SensorReadingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SensorReadings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SensorReadingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SensorReadings
     * const sensorReading = await prisma.sensorReading.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SensorReadingUpdateManyArgs>(args: SelectSubset<T, SensorReadingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SensorReadings and returns the data updated in the database.
     * @param {SensorReadingUpdateManyAndReturnArgs} args - Arguments to update many SensorReadings.
     * @example
     * // Update many SensorReadings
     * const sensorReading = await prisma.sensorReading.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SensorReadings and only return the `id`
     * const sensorReadingWithIdOnly = await prisma.sensorReading.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SensorReadingUpdateManyAndReturnArgs>(args: SelectSubset<T, SensorReadingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SensorReading.
     * @param {SensorReadingUpsertArgs} args - Arguments to update or create a SensorReading.
     * @example
     * // Update or create a SensorReading
     * const sensorReading = await prisma.sensorReading.upsert({
     *   create: {
     *     // ... data to create a SensorReading
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SensorReading we want to update
     *   }
     * })
     */
    upsert<T extends SensorReadingUpsertArgs>(args: SelectSubset<T, SensorReadingUpsertArgs<ExtArgs>>): Prisma__SensorReadingClient<$Result.GetResult<Prisma.$SensorReadingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SensorReadings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SensorReadingCountArgs} args - Arguments to filter SensorReadings to count.
     * @example
     * // Count the number of SensorReadings
     * const count = await prisma.sensorReading.count({
     *   where: {
     *     // ... the filter for the SensorReadings we want to count
     *   }
     * })
    **/
    count<T extends SensorReadingCountArgs>(
      args?: Subset<T, SensorReadingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SensorReadingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SensorReading.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SensorReadingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SensorReadingAggregateArgs>(args: Subset<T, SensorReadingAggregateArgs>): Prisma.PrismaPromise<GetSensorReadingAggregateType<T>>

    /**
     * Group by SensorReading.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SensorReadingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SensorReadingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SensorReadingGroupByArgs['orderBy'] }
        : { orderBy?: SensorReadingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SensorReadingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSensorReadingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SensorReading model
   */
  readonly fields: SensorReadingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SensorReading.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SensorReadingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    device<T extends DeviceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, DeviceDefaultArgs<ExtArgs>>): Prisma__DeviceClient<$Result.GetResult<Prisma.$DevicePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SensorReading model
   */
  interface SensorReadingFieldRefs {
    readonly id: FieldRef<"SensorReading", 'BigInt'>
    readonly deviceId: FieldRef<"SensorReading", 'String'>
    readonly roomId: FieldRef<"SensorReading", 'String'>
    readonly temperature: FieldRef<"SensorReading", 'Float'>
    readonly humidity: FieldRef<"SensorReading", 'Float'>
    readonly recordedAt: FieldRef<"SensorReading", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SensorReading findUnique
   */
  export type SensorReadingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * Filter, which SensorReading to fetch.
     */
    where: SensorReadingWhereUniqueInput
  }

  /**
   * SensorReading findUniqueOrThrow
   */
  export type SensorReadingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * Filter, which SensorReading to fetch.
     */
    where: SensorReadingWhereUniqueInput
  }

  /**
   * SensorReading findFirst
   */
  export type SensorReadingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * Filter, which SensorReading to fetch.
     */
    where?: SensorReadingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SensorReadings to fetch.
     */
    orderBy?: SensorReadingOrderByWithRelationInput | SensorReadingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SensorReadings.
     */
    cursor?: SensorReadingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SensorReadings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SensorReadings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SensorReadings.
     */
    distinct?: SensorReadingScalarFieldEnum | SensorReadingScalarFieldEnum[]
  }

  /**
   * SensorReading findFirstOrThrow
   */
  export type SensorReadingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * Filter, which SensorReading to fetch.
     */
    where?: SensorReadingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SensorReadings to fetch.
     */
    orderBy?: SensorReadingOrderByWithRelationInput | SensorReadingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SensorReadings.
     */
    cursor?: SensorReadingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SensorReadings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SensorReadings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SensorReadings.
     */
    distinct?: SensorReadingScalarFieldEnum | SensorReadingScalarFieldEnum[]
  }

  /**
   * SensorReading findMany
   */
  export type SensorReadingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * Filter, which SensorReadings to fetch.
     */
    where?: SensorReadingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SensorReadings to fetch.
     */
    orderBy?: SensorReadingOrderByWithRelationInput | SensorReadingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SensorReadings.
     */
    cursor?: SensorReadingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SensorReadings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SensorReadings.
     */
    skip?: number
    distinct?: SensorReadingScalarFieldEnum | SensorReadingScalarFieldEnum[]
  }

  /**
   * SensorReading create
   */
  export type SensorReadingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * The data needed to create a SensorReading.
     */
    data: XOR<SensorReadingCreateInput, SensorReadingUncheckedCreateInput>
  }

  /**
   * SensorReading createMany
   */
  export type SensorReadingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SensorReadings.
     */
    data: SensorReadingCreateManyInput | SensorReadingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SensorReading createManyAndReturn
   */
  export type SensorReadingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * The data used to create many SensorReadings.
     */
    data: SensorReadingCreateManyInput | SensorReadingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * SensorReading update
   */
  export type SensorReadingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * The data needed to update a SensorReading.
     */
    data: XOR<SensorReadingUpdateInput, SensorReadingUncheckedUpdateInput>
    /**
     * Choose, which SensorReading to update.
     */
    where: SensorReadingWhereUniqueInput
  }

  /**
   * SensorReading updateMany
   */
  export type SensorReadingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SensorReadings.
     */
    data: XOR<SensorReadingUpdateManyMutationInput, SensorReadingUncheckedUpdateManyInput>
    /**
     * Filter which SensorReadings to update
     */
    where?: SensorReadingWhereInput
    /**
     * Limit how many SensorReadings to update.
     */
    limit?: number
  }

  /**
   * SensorReading updateManyAndReturn
   */
  export type SensorReadingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * The data used to update SensorReadings.
     */
    data: XOR<SensorReadingUpdateManyMutationInput, SensorReadingUncheckedUpdateManyInput>
    /**
     * Filter which SensorReadings to update
     */
    where?: SensorReadingWhereInput
    /**
     * Limit how many SensorReadings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * SensorReading upsert
   */
  export type SensorReadingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * The filter to search for the SensorReading to update in case it exists.
     */
    where: SensorReadingWhereUniqueInput
    /**
     * In case the SensorReading found by the `where` argument doesn't exist, create a new SensorReading with this data.
     */
    create: XOR<SensorReadingCreateInput, SensorReadingUncheckedCreateInput>
    /**
     * In case the SensorReading was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SensorReadingUpdateInput, SensorReadingUncheckedUpdateInput>
  }

  /**
   * SensorReading delete
   */
  export type SensorReadingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
    /**
     * Filter which SensorReading to delete.
     */
    where: SensorReadingWhereUniqueInput
  }

  /**
   * SensorReading deleteMany
   */
  export type SensorReadingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SensorReadings to delete
     */
    where?: SensorReadingWhereInput
    /**
     * Limit how many SensorReadings to delete.
     */
    limit?: number
  }

  /**
   * SensorReading without action
   */
  export type SensorReadingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SensorReading
     */
    select?: SensorReadingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SensorReading
     */
    omit?: SensorReadingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SensorReadingInclude<ExtArgs> | null
  }


  /**
   * Model RoomThreshold
   */

  export type AggregateRoomThreshold = {
    _count: RoomThresholdCountAggregateOutputType | null
    _avg: RoomThresholdAvgAggregateOutputType | null
    _sum: RoomThresholdSumAggregateOutputType | null
    _min: RoomThresholdMinAggregateOutputType | null
    _max: RoomThresholdMaxAggregateOutputType | null
  }

  export type RoomThresholdAvgAggregateOutputType = {
    tempMin: number | null
    tempMax: number | null
    humMin: number | null
    humMax: number | null
    consecutiveCount: number | null
    tempOutOfCount: number | null
    tempInCount: number | null
    humOutOfCount: number | null
    humInCount: number | null
  }

  export type RoomThresholdSumAggregateOutputType = {
    tempMin: number | null
    tempMax: number | null
    humMin: number | null
    humMax: number | null
    consecutiveCount: number | null
    tempOutOfCount: number | null
    tempInCount: number | null
    humOutOfCount: number | null
    humInCount: number | null
  }

  export type RoomThresholdMinAggregateOutputType = {
    roomId: string | null
    tempMin: number | null
    tempMax: number | null
    humMin: number | null
    humMax: number | null
    consecutiveCount: number | null
    tempState: $Enums.MetricState | null
    tempOutOfCount: number | null
    tempInCount: number | null
    humState: $Enums.MetricState | null
    humOutOfCount: number | null
    humInCount: number | null
    updatedAt: Date | null
  }

  export type RoomThresholdMaxAggregateOutputType = {
    roomId: string | null
    tempMin: number | null
    tempMax: number | null
    humMin: number | null
    humMax: number | null
    consecutiveCount: number | null
    tempState: $Enums.MetricState | null
    tempOutOfCount: number | null
    tempInCount: number | null
    humState: $Enums.MetricState | null
    humOutOfCount: number | null
    humInCount: number | null
    updatedAt: Date | null
  }

  export type RoomThresholdCountAggregateOutputType = {
    roomId: number
    tempMin: number
    tempMax: number
    humMin: number
    humMax: number
    consecutiveCount: number
    tempState: number
    tempOutOfCount: number
    tempInCount: number
    humState: number
    humOutOfCount: number
    humInCount: number
    updatedAt: number
    _all: number
  }


  export type RoomThresholdAvgAggregateInputType = {
    tempMin?: true
    tempMax?: true
    humMin?: true
    humMax?: true
    consecutiveCount?: true
    tempOutOfCount?: true
    tempInCount?: true
    humOutOfCount?: true
    humInCount?: true
  }

  export type RoomThresholdSumAggregateInputType = {
    tempMin?: true
    tempMax?: true
    humMin?: true
    humMax?: true
    consecutiveCount?: true
    tempOutOfCount?: true
    tempInCount?: true
    humOutOfCount?: true
    humInCount?: true
  }

  export type RoomThresholdMinAggregateInputType = {
    roomId?: true
    tempMin?: true
    tempMax?: true
    humMin?: true
    humMax?: true
    consecutiveCount?: true
    tempState?: true
    tempOutOfCount?: true
    tempInCount?: true
    humState?: true
    humOutOfCount?: true
    humInCount?: true
    updatedAt?: true
  }

  export type RoomThresholdMaxAggregateInputType = {
    roomId?: true
    tempMin?: true
    tempMax?: true
    humMin?: true
    humMax?: true
    consecutiveCount?: true
    tempState?: true
    tempOutOfCount?: true
    tempInCount?: true
    humState?: true
    humOutOfCount?: true
    humInCount?: true
    updatedAt?: true
  }

  export type RoomThresholdCountAggregateInputType = {
    roomId?: true
    tempMin?: true
    tempMax?: true
    humMin?: true
    humMax?: true
    consecutiveCount?: true
    tempState?: true
    tempOutOfCount?: true
    tempInCount?: true
    humState?: true
    humOutOfCount?: true
    humInCount?: true
    updatedAt?: true
    _all?: true
  }

  export type RoomThresholdAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RoomThreshold to aggregate.
     */
    where?: RoomThresholdWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoomThresholds to fetch.
     */
    orderBy?: RoomThresholdOrderByWithRelationInput | RoomThresholdOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RoomThresholdWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoomThresholds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoomThresholds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RoomThresholds
    **/
    _count?: true | RoomThresholdCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RoomThresholdAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RoomThresholdSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RoomThresholdMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RoomThresholdMaxAggregateInputType
  }

  export type GetRoomThresholdAggregateType<T extends RoomThresholdAggregateArgs> = {
        [P in keyof T & keyof AggregateRoomThreshold]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRoomThreshold[P]>
      : GetScalarType<T[P], AggregateRoomThreshold[P]>
  }




  export type RoomThresholdGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RoomThresholdWhereInput
    orderBy?: RoomThresholdOrderByWithAggregationInput | RoomThresholdOrderByWithAggregationInput[]
    by: RoomThresholdScalarFieldEnum[] | RoomThresholdScalarFieldEnum
    having?: RoomThresholdScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RoomThresholdCountAggregateInputType | true
    _avg?: RoomThresholdAvgAggregateInputType
    _sum?: RoomThresholdSumAggregateInputType
    _min?: RoomThresholdMinAggregateInputType
    _max?: RoomThresholdMaxAggregateInputType
  }

  export type RoomThresholdGroupByOutputType = {
    roomId: string
    tempMin: number | null
    tempMax: number | null
    humMin: number | null
    humMax: number | null
    consecutiveCount: number
    tempState: $Enums.MetricState
    tempOutOfCount: number
    tempInCount: number
    humState: $Enums.MetricState
    humOutOfCount: number
    humInCount: number
    updatedAt: Date
    _count: RoomThresholdCountAggregateOutputType | null
    _avg: RoomThresholdAvgAggregateOutputType | null
    _sum: RoomThresholdSumAggregateOutputType | null
    _min: RoomThresholdMinAggregateOutputType | null
    _max: RoomThresholdMaxAggregateOutputType | null
  }

  type GetRoomThresholdGroupByPayload<T extends RoomThresholdGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RoomThresholdGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RoomThresholdGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RoomThresholdGroupByOutputType[P]>
            : GetScalarType<T[P], RoomThresholdGroupByOutputType[P]>
        }
      >
    >


  export type RoomThresholdSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    roomId?: boolean
    tempMin?: boolean
    tempMax?: boolean
    humMin?: boolean
    humMax?: boolean
    consecutiveCount?: boolean
    tempState?: boolean
    tempOutOfCount?: boolean
    tempInCount?: boolean
    humState?: boolean
    humOutOfCount?: boolean
    humInCount?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["roomThreshold"]>

  export type RoomThresholdSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    roomId?: boolean
    tempMin?: boolean
    tempMax?: boolean
    humMin?: boolean
    humMax?: boolean
    consecutiveCount?: boolean
    tempState?: boolean
    tempOutOfCount?: boolean
    tempInCount?: boolean
    humState?: boolean
    humOutOfCount?: boolean
    humInCount?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["roomThreshold"]>

  export type RoomThresholdSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    roomId?: boolean
    tempMin?: boolean
    tempMax?: boolean
    humMin?: boolean
    humMax?: boolean
    consecutiveCount?: boolean
    tempState?: boolean
    tempOutOfCount?: boolean
    tempInCount?: boolean
    humState?: boolean
    humOutOfCount?: boolean
    humInCount?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["roomThreshold"]>

  export type RoomThresholdSelectScalar = {
    roomId?: boolean
    tempMin?: boolean
    tempMax?: boolean
    humMin?: boolean
    humMax?: boolean
    consecutiveCount?: boolean
    tempState?: boolean
    tempOutOfCount?: boolean
    tempInCount?: boolean
    humState?: boolean
    humOutOfCount?: boolean
    humInCount?: boolean
    updatedAt?: boolean
  }

  export type RoomThresholdOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"roomId" | "tempMin" | "tempMax" | "humMin" | "humMax" | "consecutiveCount" | "tempState" | "tempOutOfCount" | "tempInCount" | "humState" | "humOutOfCount" | "humInCount" | "updatedAt", ExtArgs["result"]["roomThreshold"]>

  export type $RoomThresholdPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RoomThreshold"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      roomId: string
      tempMin: number | null
      tempMax: number | null
      humMin: number | null
      humMax: number | null
      consecutiveCount: number
      tempState: $Enums.MetricState
      tempOutOfCount: number
      tempInCount: number
      humState: $Enums.MetricState
      humOutOfCount: number
      humInCount: number
      updatedAt: Date
    }, ExtArgs["result"]["roomThreshold"]>
    composites: {}
  }

  type RoomThresholdGetPayload<S extends boolean | null | undefined | RoomThresholdDefaultArgs> = $Result.GetResult<Prisma.$RoomThresholdPayload, S>

  type RoomThresholdCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RoomThresholdFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RoomThresholdCountAggregateInputType | true
    }

  export interface RoomThresholdDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RoomThreshold'], meta: { name: 'RoomThreshold' } }
    /**
     * Find zero or one RoomThreshold that matches the filter.
     * @param {RoomThresholdFindUniqueArgs} args - Arguments to find a RoomThreshold
     * @example
     * // Get one RoomThreshold
     * const roomThreshold = await prisma.roomThreshold.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RoomThresholdFindUniqueArgs>(args: SelectSubset<T, RoomThresholdFindUniqueArgs<ExtArgs>>): Prisma__RoomThresholdClient<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RoomThreshold that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RoomThresholdFindUniqueOrThrowArgs} args - Arguments to find a RoomThreshold
     * @example
     * // Get one RoomThreshold
     * const roomThreshold = await prisma.roomThreshold.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RoomThresholdFindUniqueOrThrowArgs>(args: SelectSubset<T, RoomThresholdFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RoomThresholdClient<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RoomThreshold that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomThresholdFindFirstArgs} args - Arguments to find a RoomThreshold
     * @example
     * // Get one RoomThreshold
     * const roomThreshold = await prisma.roomThreshold.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RoomThresholdFindFirstArgs>(args?: SelectSubset<T, RoomThresholdFindFirstArgs<ExtArgs>>): Prisma__RoomThresholdClient<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RoomThreshold that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomThresholdFindFirstOrThrowArgs} args - Arguments to find a RoomThreshold
     * @example
     * // Get one RoomThreshold
     * const roomThreshold = await prisma.roomThreshold.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RoomThresholdFindFirstOrThrowArgs>(args?: SelectSubset<T, RoomThresholdFindFirstOrThrowArgs<ExtArgs>>): Prisma__RoomThresholdClient<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RoomThresholds that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomThresholdFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RoomThresholds
     * const roomThresholds = await prisma.roomThreshold.findMany()
     * 
     * // Get first 10 RoomThresholds
     * const roomThresholds = await prisma.roomThreshold.findMany({ take: 10 })
     * 
     * // Only select the `roomId`
     * const roomThresholdWithRoomIdOnly = await prisma.roomThreshold.findMany({ select: { roomId: true } })
     * 
     */
    findMany<T extends RoomThresholdFindManyArgs>(args?: SelectSubset<T, RoomThresholdFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RoomThreshold.
     * @param {RoomThresholdCreateArgs} args - Arguments to create a RoomThreshold.
     * @example
     * // Create one RoomThreshold
     * const RoomThreshold = await prisma.roomThreshold.create({
     *   data: {
     *     // ... data to create a RoomThreshold
     *   }
     * })
     * 
     */
    create<T extends RoomThresholdCreateArgs>(args: SelectSubset<T, RoomThresholdCreateArgs<ExtArgs>>): Prisma__RoomThresholdClient<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RoomThresholds.
     * @param {RoomThresholdCreateManyArgs} args - Arguments to create many RoomThresholds.
     * @example
     * // Create many RoomThresholds
     * const roomThreshold = await prisma.roomThreshold.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RoomThresholdCreateManyArgs>(args?: SelectSubset<T, RoomThresholdCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RoomThresholds and returns the data saved in the database.
     * @param {RoomThresholdCreateManyAndReturnArgs} args - Arguments to create many RoomThresholds.
     * @example
     * // Create many RoomThresholds
     * const roomThreshold = await prisma.roomThreshold.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RoomThresholds and only return the `roomId`
     * const roomThresholdWithRoomIdOnly = await prisma.roomThreshold.createManyAndReturn({
     *   select: { roomId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RoomThresholdCreateManyAndReturnArgs>(args?: SelectSubset<T, RoomThresholdCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RoomThreshold.
     * @param {RoomThresholdDeleteArgs} args - Arguments to delete one RoomThreshold.
     * @example
     * // Delete one RoomThreshold
     * const RoomThreshold = await prisma.roomThreshold.delete({
     *   where: {
     *     // ... filter to delete one RoomThreshold
     *   }
     * })
     * 
     */
    delete<T extends RoomThresholdDeleteArgs>(args: SelectSubset<T, RoomThresholdDeleteArgs<ExtArgs>>): Prisma__RoomThresholdClient<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RoomThreshold.
     * @param {RoomThresholdUpdateArgs} args - Arguments to update one RoomThreshold.
     * @example
     * // Update one RoomThreshold
     * const roomThreshold = await prisma.roomThreshold.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RoomThresholdUpdateArgs>(args: SelectSubset<T, RoomThresholdUpdateArgs<ExtArgs>>): Prisma__RoomThresholdClient<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RoomThresholds.
     * @param {RoomThresholdDeleteManyArgs} args - Arguments to filter RoomThresholds to delete.
     * @example
     * // Delete a few RoomThresholds
     * const { count } = await prisma.roomThreshold.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RoomThresholdDeleteManyArgs>(args?: SelectSubset<T, RoomThresholdDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RoomThresholds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomThresholdUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RoomThresholds
     * const roomThreshold = await prisma.roomThreshold.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RoomThresholdUpdateManyArgs>(args: SelectSubset<T, RoomThresholdUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RoomThresholds and returns the data updated in the database.
     * @param {RoomThresholdUpdateManyAndReturnArgs} args - Arguments to update many RoomThresholds.
     * @example
     * // Update many RoomThresholds
     * const roomThreshold = await prisma.roomThreshold.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RoomThresholds and only return the `roomId`
     * const roomThresholdWithRoomIdOnly = await prisma.roomThreshold.updateManyAndReturn({
     *   select: { roomId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RoomThresholdUpdateManyAndReturnArgs>(args: SelectSubset<T, RoomThresholdUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RoomThreshold.
     * @param {RoomThresholdUpsertArgs} args - Arguments to update or create a RoomThreshold.
     * @example
     * // Update or create a RoomThreshold
     * const roomThreshold = await prisma.roomThreshold.upsert({
     *   create: {
     *     // ... data to create a RoomThreshold
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RoomThreshold we want to update
     *   }
     * })
     */
    upsert<T extends RoomThresholdUpsertArgs>(args: SelectSubset<T, RoomThresholdUpsertArgs<ExtArgs>>): Prisma__RoomThresholdClient<$Result.GetResult<Prisma.$RoomThresholdPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RoomThresholds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomThresholdCountArgs} args - Arguments to filter RoomThresholds to count.
     * @example
     * // Count the number of RoomThresholds
     * const count = await prisma.roomThreshold.count({
     *   where: {
     *     // ... the filter for the RoomThresholds we want to count
     *   }
     * })
    **/
    count<T extends RoomThresholdCountArgs>(
      args?: Subset<T, RoomThresholdCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RoomThresholdCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RoomThreshold.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomThresholdAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RoomThresholdAggregateArgs>(args: Subset<T, RoomThresholdAggregateArgs>): Prisma.PrismaPromise<GetRoomThresholdAggregateType<T>>

    /**
     * Group by RoomThreshold.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoomThresholdGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RoomThresholdGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RoomThresholdGroupByArgs['orderBy'] }
        : { orderBy?: RoomThresholdGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RoomThresholdGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRoomThresholdGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RoomThreshold model
   */
  readonly fields: RoomThresholdFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RoomThreshold.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RoomThresholdClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RoomThreshold model
   */
  interface RoomThresholdFieldRefs {
    readonly roomId: FieldRef<"RoomThreshold", 'String'>
    readonly tempMin: FieldRef<"RoomThreshold", 'Float'>
    readonly tempMax: FieldRef<"RoomThreshold", 'Float'>
    readonly humMin: FieldRef<"RoomThreshold", 'Float'>
    readonly humMax: FieldRef<"RoomThreshold", 'Float'>
    readonly consecutiveCount: FieldRef<"RoomThreshold", 'Int'>
    readonly tempState: FieldRef<"RoomThreshold", 'MetricState'>
    readonly tempOutOfCount: FieldRef<"RoomThreshold", 'Int'>
    readonly tempInCount: FieldRef<"RoomThreshold", 'Int'>
    readonly humState: FieldRef<"RoomThreshold", 'MetricState'>
    readonly humOutOfCount: FieldRef<"RoomThreshold", 'Int'>
    readonly humInCount: FieldRef<"RoomThreshold", 'Int'>
    readonly updatedAt: FieldRef<"RoomThreshold", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RoomThreshold findUnique
   */
  export type RoomThresholdFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * Filter, which RoomThreshold to fetch.
     */
    where: RoomThresholdWhereUniqueInput
  }

  /**
   * RoomThreshold findUniqueOrThrow
   */
  export type RoomThresholdFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * Filter, which RoomThreshold to fetch.
     */
    where: RoomThresholdWhereUniqueInput
  }

  /**
   * RoomThreshold findFirst
   */
  export type RoomThresholdFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * Filter, which RoomThreshold to fetch.
     */
    where?: RoomThresholdWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoomThresholds to fetch.
     */
    orderBy?: RoomThresholdOrderByWithRelationInput | RoomThresholdOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RoomThresholds.
     */
    cursor?: RoomThresholdWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoomThresholds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoomThresholds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RoomThresholds.
     */
    distinct?: RoomThresholdScalarFieldEnum | RoomThresholdScalarFieldEnum[]
  }

  /**
   * RoomThreshold findFirstOrThrow
   */
  export type RoomThresholdFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * Filter, which RoomThreshold to fetch.
     */
    where?: RoomThresholdWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoomThresholds to fetch.
     */
    orderBy?: RoomThresholdOrderByWithRelationInput | RoomThresholdOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RoomThresholds.
     */
    cursor?: RoomThresholdWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoomThresholds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoomThresholds.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RoomThresholds.
     */
    distinct?: RoomThresholdScalarFieldEnum | RoomThresholdScalarFieldEnum[]
  }

  /**
   * RoomThreshold findMany
   */
  export type RoomThresholdFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * Filter, which RoomThresholds to fetch.
     */
    where?: RoomThresholdWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoomThresholds to fetch.
     */
    orderBy?: RoomThresholdOrderByWithRelationInput | RoomThresholdOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RoomThresholds.
     */
    cursor?: RoomThresholdWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoomThresholds from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoomThresholds.
     */
    skip?: number
    distinct?: RoomThresholdScalarFieldEnum | RoomThresholdScalarFieldEnum[]
  }

  /**
   * RoomThreshold create
   */
  export type RoomThresholdCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * The data needed to create a RoomThreshold.
     */
    data: XOR<RoomThresholdCreateInput, RoomThresholdUncheckedCreateInput>
  }

  /**
   * RoomThreshold createMany
   */
  export type RoomThresholdCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RoomThresholds.
     */
    data: RoomThresholdCreateManyInput | RoomThresholdCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RoomThreshold createManyAndReturn
   */
  export type RoomThresholdCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * The data used to create many RoomThresholds.
     */
    data: RoomThresholdCreateManyInput | RoomThresholdCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RoomThreshold update
   */
  export type RoomThresholdUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * The data needed to update a RoomThreshold.
     */
    data: XOR<RoomThresholdUpdateInput, RoomThresholdUncheckedUpdateInput>
    /**
     * Choose, which RoomThreshold to update.
     */
    where: RoomThresholdWhereUniqueInput
  }

  /**
   * RoomThreshold updateMany
   */
  export type RoomThresholdUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RoomThresholds.
     */
    data: XOR<RoomThresholdUpdateManyMutationInput, RoomThresholdUncheckedUpdateManyInput>
    /**
     * Filter which RoomThresholds to update
     */
    where?: RoomThresholdWhereInput
    /**
     * Limit how many RoomThresholds to update.
     */
    limit?: number
  }

  /**
   * RoomThreshold updateManyAndReturn
   */
  export type RoomThresholdUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * The data used to update RoomThresholds.
     */
    data: XOR<RoomThresholdUpdateManyMutationInput, RoomThresholdUncheckedUpdateManyInput>
    /**
     * Filter which RoomThresholds to update
     */
    where?: RoomThresholdWhereInput
    /**
     * Limit how many RoomThresholds to update.
     */
    limit?: number
  }

  /**
   * RoomThreshold upsert
   */
  export type RoomThresholdUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * The filter to search for the RoomThreshold to update in case it exists.
     */
    where: RoomThresholdWhereUniqueInput
    /**
     * In case the RoomThreshold found by the `where` argument doesn't exist, create a new RoomThreshold with this data.
     */
    create: XOR<RoomThresholdCreateInput, RoomThresholdUncheckedCreateInput>
    /**
     * In case the RoomThreshold was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RoomThresholdUpdateInput, RoomThresholdUncheckedUpdateInput>
  }

  /**
   * RoomThreshold delete
   */
  export type RoomThresholdDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
    /**
     * Filter which RoomThreshold to delete.
     */
    where: RoomThresholdWhereUniqueInput
  }

  /**
   * RoomThreshold deleteMany
   */
  export type RoomThresholdDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RoomThresholds to delete
     */
    where?: RoomThresholdWhereInput
    /**
     * Limit how many RoomThresholds to delete.
     */
    limit?: number
  }

  /**
   * RoomThreshold without action
   */
  export type RoomThresholdDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoomThreshold
     */
    select?: RoomThresholdSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RoomThreshold
     */
    omit?: RoomThresholdOmit<ExtArgs> | null
  }


  /**
   * Model PendingAlert
   */

  export type AggregatePendingAlert = {
    _count: PendingAlertCountAggregateOutputType | null
    _avg: PendingAlertAvgAggregateOutputType | null
    _sum: PendingAlertSumAggregateOutputType | null
    _min: PendingAlertMinAggregateOutputType | null
    _max: PendingAlertMaxAggregateOutputType | null
  }

  export type PendingAlertAvgAggregateOutputType = {
    attempts: number | null
  }

  export type PendingAlertSumAggregateOutputType = {
    attempts: number | null
  }

  export type PendingAlertMinAggregateOutputType = {
    id: string | null
    dedupeKey: string | null
    attempts: number | null
    sentAt: Date | null
    createdAt: Date | null
  }

  export type PendingAlertMaxAggregateOutputType = {
    id: string | null
    dedupeKey: string | null
    attempts: number | null
    sentAt: Date | null
    createdAt: Date | null
  }

  export type PendingAlertCountAggregateOutputType = {
    id: number
    dedupeKey: number
    payload: number
    attempts: number
    sentAt: number
    createdAt: number
    _all: number
  }


  export type PendingAlertAvgAggregateInputType = {
    attempts?: true
  }

  export type PendingAlertSumAggregateInputType = {
    attempts?: true
  }

  export type PendingAlertMinAggregateInputType = {
    id?: true
    dedupeKey?: true
    attempts?: true
    sentAt?: true
    createdAt?: true
  }

  export type PendingAlertMaxAggregateInputType = {
    id?: true
    dedupeKey?: true
    attempts?: true
    sentAt?: true
    createdAt?: true
  }

  export type PendingAlertCountAggregateInputType = {
    id?: true
    dedupeKey?: true
    payload?: true
    attempts?: true
    sentAt?: true
    createdAt?: true
    _all?: true
  }

  export type PendingAlertAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PendingAlert to aggregate.
     */
    where?: PendingAlertWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PendingAlerts to fetch.
     */
    orderBy?: PendingAlertOrderByWithRelationInput | PendingAlertOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PendingAlertWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PendingAlerts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PendingAlerts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PendingAlerts
    **/
    _count?: true | PendingAlertCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PendingAlertAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PendingAlertSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PendingAlertMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PendingAlertMaxAggregateInputType
  }

  export type GetPendingAlertAggregateType<T extends PendingAlertAggregateArgs> = {
        [P in keyof T & keyof AggregatePendingAlert]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePendingAlert[P]>
      : GetScalarType<T[P], AggregatePendingAlert[P]>
  }




  export type PendingAlertGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PendingAlertWhereInput
    orderBy?: PendingAlertOrderByWithAggregationInput | PendingAlertOrderByWithAggregationInput[]
    by: PendingAlertScalarFieldEnum[] | PendingAlertScalarFieldEnum
    having?: PendingAlertScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PendingAlertCountAggregateInputType | true
    _avg?: PendingAlertAvgAggregateInputType
    _sum?: PendingAlertSumAggregateInputType
    _min?: PendingAlertMinAggregateInputType
    _max?: PendingAlertMaxAggregateInputType
  }

  export type PendingAlertGroupByOutputType = {
    id: string
    dedupeKey: string
    payload: JsonValue
    attempts: number
    sentAt: Date | null
    createdAt: Date
    _count: PendingAlertCountAggregateOutputType | null
    _avg: PendingAlertAvgAggregateOutputType | null
    _sum: PendingAlertSumAggregateOutputType | null
    _min: PendingAlertMinAggregateOutputType | null
    _max: PendingAlertMaxAggregateOutputType | null
  }

  type GetPendingAlertGroupByPayload<T extends PendingAlertGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PendingAlertGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PendingAlertGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PendingAlertGroupByOutputType[P]>
            : GetScalarType<T[P], PendingAlertGroupByOutputType[P]>
        }
      >
    >


  export type PendingAlertSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dedupeKey?: boolean
    payload?: boolean
    attempts?: boolean
    sentAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["pendingAlert"]>

  export type PendingAlertSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dedupeKey?: boolean
    payload?: boolean
    attempts?: boolean
    sentAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["pendingAlert"]>

  export type PendingAlertSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dedupeKey?: boolean
    payload?: boolean
    attempts?: boolean
    sentAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["pendingAlert"]>

  export type PendingAlertSelectScalar = {
    id?: boolean
    dedupeKey?: boolean
    payload?: boolean
    attempts?: boolean
    sentAt?: boolean
    createdAt?: boolean
  }

  export type PendingAlertOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "dedupeKey" | "payload" | "attempts" | "sentAt" | "createdAt", ExtArgs["result"]["pendingAlert"]>

  export type $PendingAlertPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PendingAlert"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      dedupeKey: string
      payload: Prisma.JsonValue
      attempts: number
      sentAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["pendingAlert"]>
    composites: {}
  }

  type PendingAlertGetPayload<S extends boolean | null | undefined | PendingAlertDefaultArgs> = $Result.GetResult<Prisma.$PendingAlertPayload, S>

  type PendingAlertCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PendingAlertFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PendingAlertCountAggregateInputType | true
    }

  export interface PendingAlertDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PendingAlert'], meta: { name: 'PendingAlert' } }
    /**
     * Find zero or one PendingAlert that matches the filter.
     * @param {PendingAlertFindUniqueArgs} args - Arguments to find a PendingAlert
     * @example
     * // Get one PendingAlert
     * const pendingAlert = await prisma.pendingAlert.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PendingAlertFindUniqueArgs>(args: SelectSubset<T, PendingAlertFindUniqueArgs<ExtArgs>>): Prisma__PendingAlertClient<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PendingAlert that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PendingAlertFindUniqueOrThrowArgs} args - Arguments to find a PendingAlert
     * @example
     * // Get one PendingAlert
     * const pendingAlert = await prisma.pendingAlert.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PendingAlertFindUniqueOrThrowArgs>(args: SelectSubset<T, PendingAlertFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PendingAlertClient<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PendingAlert that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PendingAlertFindFirstArgs} args - Arguments to find a PendingAlert
     * @example
     * // Get one PendingAlert
     * const pendingAlert = await prisma.pendingAlert.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PendingAlertFindFirstArgs>(args?: SelectSubset<T, PendingAlertFindFirstArgs<ExtArgs>>): Prisma__PendingAlertClient<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PendingAlert that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PendingAlertFindFirstOrThrowArgs} args - Arguments to find a PendingAlert
     * @example
     * // Get one PendingAlert
     * const pendingAlert = await prisma.pendingAlert.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PendingAlertFindFirstOrThrowArgs>(args?: SelectSubset<T, PendingAlertFindFirstOrThrowArgs<ExtArgs>>): Prisma__PendingAlertClient<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PendingAlerts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PendingAlertFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PendingAlerts
     * const pendingAlerts = await prisma.pendingAlert.findMany()
     * 
     * // Get first 10 PendingAlerts
     * const pendingAlerts = await prisma.pendingAlert.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pendingAlertWithIdOnly = await prisma.pendingAlert.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PendingAlertFindManyArgs>(args?: SelectSubset<T, PendingAlertFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PendingAlert.
     * @param {PendingAlertCreateArgs} args - Arguments to create a PendingAlert.
     * @example
     * // Create one PendingAlert
     * const PendingAlert = await prisma.pendingAlert.create({
     *   data: {
     *     // ... data to create a PendingAlert
     *   }
     * })
     * 
     */
    create<T extends PendingAlertCreateArgs>(args: SelectSubset<T, PendingAlertCreateArgs<ExtArgs>>): Prisma__PendingAlertClient<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PendingAlerts.
     * @param {PendingAlertCreateManyArgs} args - Arguments to create many PendingAlerts.
     * @example
     * // Create many PendingAlerts
     * const pendingAlert = await prisma.pendingAlert.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PendingAlertCreateManyArgs>(args?: SelectSubset<T, PendingAlertCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PendingAlerts and returns the data saved in the database.
     * @param {PendingAlertCreateManyAndReturnArgs} args - Arguments to create many PendingAlerts.
     * @example
     * // Create many PendingAlerts
     * const pendingAlert = await prisma.pendingAlert.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PendingAlerts and only return the `id`
     * const pendingAlertWithIdOnly = await prisma.pendingAlert.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PendingAlertCreateManyAndReturnArgs>(args?: SelectSubset<T, PendingAlertCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PendingAlert.
     * @param {PendingAlertDeleteArgs} args - Arguments to delete one PendingAlert.
     * @example
     * // Delete one PendingAlert
     * const PendingAlert = await prisma.pendingAlert.delete({
     *   where: {
     *     // ... filter to delete one PendingAlert
     *   }
     * })
     * 
     */
    delete<T extends PendingAlertDeleteArgs>(args: SelectSubset<T, PendingAlertDeleteArgs<ExtArgs>>): Prisma__PendingAlertClient<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PendingAlert.
     * @param {PendingAlertUpdateArgs} args - Arguments to update one PendingAlert.
     * @example
     * // Update one PendingAlert
     * const pendingAlert = await prisma.pendingAlert.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PendingAlertUpdateArgs>(args: SelectSubset<T, PendingAlertUpdateArgs<ExtArgs>>): Prisma__PendingAlertClient<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PendingAlerts.
     * @param {PendingAlertDeleteManyArgs} args - Arguments to filter PendingAlerts to delete.
     * @example
     * // Delete a few PendingAlerts
     * const { count } = await prisma.pendingAlert.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PendingAlertDeleteManyArgs>(args?: SelectSubset<T, PendingAlertDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PendingAlerts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PendingAlertUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PendingAlerts
     * const pendingAlert = await prisma.pendingAlert.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PendingAlertUpdateManyArgs>(args: SelectSubset<T, PendingAlertUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PendingAlerts and returns the data updated in the database.
     * @param {PendingAlertUpdateManyAndReturnArgs} args - Arguments to update many PendingAlerts.
     * @example
     * // Update many PendingAlerts
     * const pendingAlert = await prisma.pendingAlert.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PendingAlerts and only return the `id`
     * const pendingAlertWithIdOnly = await prisma.pendingAlert.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PendingAlertUpdateManyAndReturnArgs>(args: SelectSubset<T, PendingAlertUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PendingAlert.
     * @param {PendingAlertUpsertArgs} args - Arguments to update or create a PendingAlert.
     * @example
     * // Update or create a PendingAlert
     * const pendingAlert = await prisma.pendingAlert.upsert({
     *   create: {
     *     // ... data to create a PendingAlert
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PendingAlert we want to update
     *   }
     * })
     */
    upsert<T extends PendingAlertUpsertArgs>(args: SelectSubset<T, PendingAlertUpsertArgs<ExtArgs>>): Prisma__PendingAlertClient<$Result.GetResult<Prisma.$PendingAlertPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PendingAlerts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PendingAlertCountArgs} args - Arguments to filter PendingAlerts to count.
     * @example
     * // Count the number of PendingAlerts
     * const count = await prisma.pendingAlert.count({
     *   where: {
     *     // ... the filter for the PendingAlerts we want to count
     *   }
     * })
    **/
    count<T extends PendingAlertCountArgs>(
      args?: Subset<T, PendingAlertCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PendingAlertCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PendingAlert.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PendingAlertAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PendingAlertAggregateArgs>(args: Subset<T, PendingAlertAggregateArgs>): Prisma.PrismaPromise<GetPendingAlertAggregateType<T>>

    /**
     * Group by PendingAlert.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PendingAlertGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PendingAlertGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PendingAlertGroupByArgs['orderBy'] }
        : { orderBy?: PendingAlertGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PendingAlertGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPendingAlertGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PendingAlert model
   */
  readonly fields: PendingAlertFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PendingAlert.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PendingAlertClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PendingAlert model
   */
  interface PendingAlertFieldRefs {
    readonly id: FieldRef<"PendingAlert", 'String'>
    readonly dedupeKey: FieldRef<"PendingAlert", 'String'>
    readonly payload: FieldRef<"PendingAlert", 'Json'>
    readonly attempts: FieldRef<"PendingAlert", 'Int'>
    readonly sentAt: FieldRef<"PendingAlert", 'DateTime'>
    readonly createdAt: FieldRef<"PendingAlert", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PendingAlert findUnique
   */
  export type PendingAlertFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * Filter, which PendingAlert to fetch.
     */
    where: PendingAlertWhereUniqueInput
  }

  /**
   * PendingAlert findUniqueOrThrow
   */
  export type PendingAlertFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * Filter, which PendingAlert to fetch.
     */
    where: PendingAlertWhereUniqueInput
  }

  /**
   * PendingAlert findFirst
   */
  export type PendingAlertFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * Filter, which PendingAlert to fetch.
     */
    where?: PendingAlertWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PendingAlerts to fetch.
     */
    orderBy?: PendingAlertOrderByWithRelationInput | PendingAlertOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PendingAlerts.
     */
    cursor?: PendingAlertWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PendingAlerts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PendingAlerts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PendingAlerts.
     */
    distinct?: PendingAlertScalarFieldEnum | PendingAlertScalarFieldEnum[]
  }

  /**
   * PendingAlert findFirstOrThrow
   */
  export type PendingAlertFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * Filter, which PendingAlert to fetch.
     */
    where?: PendingAlertWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PendingAlerts to fetch.
     */
    orderBy?: PendingAlertOrderByWithRelationInput | PendingAlertOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PendingAlerts.
     */
    cursor?: PendingAlertWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PendingAlerts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PendingAlerts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PendingAlerts.
     */
    distinct?: PendingAlertScalarFieldEnum | PendingAlertScalarFieldEnum[]
  }

  /**
   * PendingAlert findMany
   */
  export type PendingAlertFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * Filter, which PendingAlerts to fetch.
     */
    where?: PendingAlertWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PendingAlerts to fetch.
     */
    orderBy?: PendingAlertOrderByWithRelationInput | PendingAlertOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PendingAlerts.
     */
    cursor?: PendingAlertWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PendingAlerts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PendingAlerts.
     */
    skip?: number
    distinct?: PendingAlertScalarFieldEnum | PendingAlertScalarFieldEnum[]
  }

  /**
   * PendingAlert create
   */
  export type PendingAlertCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * The data needed to create a PendingAlert.
     */
    data: XOR<PendingAlertCreateInput, PendingAlertUncheckedCreateInput>
  }

  /**
   * PendingAlert createMany
   */
  export type PendingAlertCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PendingAlerts.
     */
    data: PendingAlertCreateManyInput | PendingAlertCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PendingAlert createManyAndReturn
   */
  export type PendingAlertCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * The data used to create many PendingAlerts.
     */
    data: PendingAlertCreateManyInput | PendingAlertCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PendingAlert update
   */
  export type PendingAlertUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * The data needed to update a PendingAlert.
     */
    data: XOR<PendingAlertUpdateInput, PendingAlertUncheckedUpdateInput>
    /**
     * Choose, which PendingAlert to update.
     */
    where: PendingAlertWhereUniqueInput
  }

  /**
   * PendingAlert updateMany
   */
  export type PendingAlertUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PendingAlerts.
     */
    data: XOR<PendingAlertUpdateManyMutationInput, PendingAlertUncheckedUpdateManyInput>
    /**
     * Filter which PendingAlerts to update
     */
    where?: PendingAlertWhereInput
    /**
     * Limit how many PendingAlerts to update.
     */
    limit?: number
  }

  /**
   * PendingAlert updateManyAndReturn
   */
  export type PendingAlertUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * The data used to update PendingAlerts.
     */
    data: XOR<PendingAlertUpdateManyMutationInput, PendingAlertUncheckedUpdateManyInput>
    /**
     * Filter which PendingAlerts to update
     */
    where?: PendingAlertWhereInput
    /**
     * Limit how many PendingAlerts to update.
     */
    limit?: number
  }

  /**
   * PendingAlert upsert
   */
  export type PendingAlertUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * The filter to search for the PendingAlert to update in case it exists.
     */
    where: PendingAlertWhereUniqueInput
    /**
     * In case the PendingAlert found by the `where` argument doesn't exist, create a new PendingAlert with this data.
     */
    create: XOR<PendingAlertCreateInput, PendingAlertUncheckedCreateInput>
    /**
     * In case the PendingAlert was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PendingAlertUpdateInput, PendingAlertUncheckedUpdateInput>
  }

  /**
   * PendingAlert delete
   */
  export type PendingAlertDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
    /**
     * Filter which PendingAlert to delete.
     */
    where: PendingAlertWhereUniqueInput
  }

  /**
   * PendingAlert deleteMany
   */
  export type PendingAlertDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PendingAlerts to delete
     */
    where?: PendingAlertWhereInput
    /**
     * Limit how many PendingAlerts to delete.
     */
    limit?: number
  }

  /**
   * PendingAlert without action
   */
  export type PendingAlertDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PendingAlert
     */
    select?: PendingAlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PendingAlert
     */
    omit?: PendingAlertOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const DeviceScalarFieldEnum: {
    id: 'id',
    roomId: 'roomId',
    type: 'type',
    name: 'name',
    apiKeyHash: 'apiKeyHash',
    intervalSec: 'intervalSec',
    isSimulated: 'isSimulated',
    status: 'status',
    connectionState: 'connectionState',
    lastSeen: 'lastSeen',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type DeviceScalarFieldEnum = (typeof DeviceScalarFieldEnum)[keyof typeof DeviceScalarFieldEnum]


  export const CameraLatestScalarFieldEnum: {
    deviceId: 'deviceId',
    image: 'image',
    capturedAt: 'capturedAt',
    updatedAt: 'updatedAt'
  };

  export type CameraLatestScalarFieldEnum = (typeof CameraLatestScalarFieldEnum)[keyof typeof CameraLatestScalarFieldEnum]


  export const SensorReadingScalarFieldEnum: {
    id: 'id',
    deviceId: 'deviceId',
    roomId: 'roomId',
    temperature: 'temperature',
    humidity: 'humidity',
    recordedAt: 'recordedAt'
  };

  export type SensorReadingScalarFieldEnum = (typeof SensorReadingScalarFieldEnum)[keyof typeof SensorReadingScalarFieldEnum]


  export const RoomThresholdScalarFieldEnum: {
    roomId: 'roomId',
    tempMin: 'tempMin',
    tempMax: 'tempMax',
    humMin: 'humMin',
    humMax: 'humMax',
    consecutiveCount: 'consecutiveCount',
    tempState: 'tempState',
    tempOutOfCount: 'tempOutOfCount',
    tempInCount: 'tempInCount',
    humState: 'humState',
    humOutOfCount: 'humOutOfCount',
    humInCount: 'humInCount',
    updatedAt: 'updatedAt'
  };

  export type RoomThresholdScalarFieldEnum = (typeof RoomThresholdScalarFieldEnum)[keyof typeof RoomThresholdScalarFieldEnum]


  export const PendingAlertScalarFieldEnum: {
    id: 'id',
    dedupeKey: 'dedupeKey',
    payload: 'payload',
    attempts: 'attempts',
    sentAt: 'sentAt',
    createdAt: 'createdAt'
  };

  export type PendingAlertScalarFieldEnum = (typeof PendingAlertScalarFieldEnum)[keyof typeof PendingAlertScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DeviceType'
   */
  export type EnumDeviceTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DeviceType'>
    


  /**
   * Reference to a field of type 'DeviceType[]'
   */
  export type ListEnumDeviceTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DeviceType[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DeviceStatus'
   */
  export type EnumDeviceStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DeviceStatus'>
    


  /**
   * Reference to a field of type 'DeviceStatus[]'
   */
  export type ListEnumDeviceStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DeviceStatus[]'>
    


  /**
   * Reference to a field of type 'ConnectionState'
   */
  export type EnumConnectionStateFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectionState'>
    


  /**
   * Reference to a field of type 'ConnectionState[]'
   */
  export type ListEnumConnectionStateFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectionState[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Bytes'
   */
  export type BytesFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Bytes'>
    


  /**
   * Reference to a field of type 'Bytes[]'
   */
  export type ListBytesFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Bytes[]'>
    


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'BigInt[]'
   */
  export type ListBigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'MetricState'
   */
  export type EnumMetricStateFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MetricState'>
    


  /**
   * Reference to a field of type 'MetricState[]'
   */
  export type ListEnumMetricStateFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MetricState[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    
  /**
   * Deep Input Types
   */


  export type DeviceWhereInput = {
    AND?: DeviceWhereInput | DeviceWhereInput[]
    OR?: DeviceWhereInput[]
    NOT?: DeviceWhereInput | DeviceWhereInput[]
    id?: UuidFilter<"Device"> | string
    roomId?: UuidFilter<"Device"> | string
    type?: EnumDeviceTypeFilter<"Device"> | $Enums.DeviceType
    name?: StringFilter<"Device"> | string
    apiKeyHash?: StringFilter<"Device"> | string
    intervalSec?: IntFilter<"Device"> | number
    isSimulated?: BoolFilter<"Device"> | boolean
    status?: EnumDeviceStatusFilter<"Device"> | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFilter<"Device"> | $Enums.ConnectionState
    lastSeen?: DateTimeNullableFilter<"Device"> | Date | string | null
    createdAt?: DateTimeFilter<"Device"> | Date | string
    updatedAt?: DateTimeFilter<"Device"> | Date | string
    cameraLatest?: XOR<CameraLatestNullableScalarRelationFilter, CameraLatestWhereInput> | null
    readings?: SensorReadingListRelationFilter
  }

  export type DeviceOrderByWithRelationInput = {
    id?: SortOrder
    roomId?: SortOrder
    type?: SortOrder
    name?: SortOrder
    apiKeyHash?: SortOrder
    intervalSec?: SortOrder
    isSimulated?: SortOrder
    status?: SortOrder
    connectionState?: SortOrder
    lastSeen?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    cameraLatest?: CameraLatestOrderByWithRelationInput
    readings?: SensorReadingOrderByRelationAggregateInput
  }

  export type DeviceWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    apiKeyHash?: string
    AND?: DeviceWhereInput | DeviceWhereInput[]
    OR?: DeviceWhereInput[]
    NOT?: DeviceWhereInput | DeviceWhereInput[]
    roomId?: UuidFilter<"Device"> | string
    type?: EnumDeviceTypeFilter<"Device"> | $Enums.DeviceType
    name?: StringFilter<"Device"> | string
    intervalSec?: IntFilter<"Device"> | number
    isSimulated?: BoolFilter<"Device"> | boolean
    status?: EnumDeviceStatusFilter<"Device"> | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFilter<"Device"> | $Enums.ConnectionState
    lastSeen?: DateTimeNullableFilter<"Device"> | Date | string | null
    createdAt?: DateTimeFilter<"Device"> | Date | string
    updatedAt?: DateTimeFilter<"Device"> | Date | string
    cameraLatest?: XOR<CameraLatestNullableScalarRelationFilter, CameraLatestWhereInput> | null
    readings?: SensorReadingListRelationFilter
  }, "id" | "apiKeyHash">

  export type DeviceOrderByWithAggregationInput = {
    id?: SortOrder
    roomId?: SortOrder
    type?: SortOrder
    name?: SortOrder
    apiKeyHash?: SortOrder
    intervalSec?: SortOrder
    isSimulated?: SortOrder
    status?: SortOrder
    connectionState?: SortOrder
    lastSeen?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: DeviceCountOrderByAggregateInput
    _avg?: DeviceAvgOrderByAggregateInput
    _max?: DeviceMaxOrderByAggregateInput
    _min?: DeviceMinOrderByAggregateInput
    _sum?: DeviceSumOrderByAggregateInput
  }

  export type DeviceScalarWhereWithAggregatesInput = {
    AND?: DeviceScalarWhereWithAggregatesInput | DeviceScalarWhereWithAggregatesInput[]
    OR?: DeviceScalarWhereWithAggregatesInput[]
    NOT?: DeviceScalarWhereWithAggregatesInput | DeviceScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Device"> | string
    roomId?: UuidWithAggregatesFilter<"Device"> | string
    type?: EnumDeviceTypeWithAggregatesFilter<"Device"> | $Enums.DeviceType
    name?: StringWithAggregatesFilter<"Device"> | string
    apiKeyHash?: StringWithAggregatesFilter<"Device"> | string
    intervalSec?: IntWithAggregatesFilter<"Device"> | number
    isSimulated?: BoolWithAggregatesFilter<"Device"> | boolean
    status?: EnumDeviceStatusWithAggregatesFilter<"Device"> | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateWithAggregatesFilter<"Device"> | $Enums.ConnectionState
    lastSeen?: DateTimeNullableWithAggregatesFilter<"Device"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Device"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Device"> | Date | string
  }

  export type CameraLatestWhereInput = {
    AND?: CameraLatestWhereInput | CameraLatestWhereInput[]
    OR?: CameraLatestWhereInput[]
    NOT?: CameraLatestWhereInput | CameraLatestWhereInput[]
    deviceId?: UuidFilter<"CameraLatest"> | string
    image?: BytesFilter<"CameraLatest"> | Bytes
    capturedAt?: DateTimeFilter<"CameraLatest"> | Date | string
    updatedAt?: DateTimeFilter<"CameraLatest"> | Date | string
    device?: XOR<DeviceScalarRelationFilter, DeviceWhereInput>
  }

  export type CameraLatestOrderByWithRelationInput = {
    deviceId?: SortOrder
    image?: SortOrder
    capturedAt?: SortOrder
    updatedAt?: SortOrder
    device?: DeviceOrderByWithRelationInput
  }

  export type CameraLatestWhereUniqueInput = Prisma.AtLeast<{
    deviceId?: string
    AND?: CameraLatestWhereInput | CameraLatestWhereInput[]
    OR?: CameraLatestWhereInput[]
    NOT?: CameraLatestWhereInput | CameraLatestWhereInput[]
    image?: BytesFilter<"CameraLatest"> | Bytes
    capturedAt?: DateTimeFilter<"CameraLatest"> | Date | string
    updatedAt?: DateTimeFilter<"CameraLatest"> | Date | string
    device?: XOR<DeviceScalarRelationFilter, DeviceWhereInput>
  }, "deviceId">

  export type CameraLatestOrderByWithAggregationInput = {
    deviceId?: SortOrder
    image?: SortOrder
    capturedAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CameraLatestCountOrderByAggregateInput
    _max?: CameraLatestMaxOrderByAggregateInput
    _min?: CameraLatestMinOrderByAggregateInput
  }

  export type CameraLatestScalarWhereWithAggregatesInput = {
    AND?: CameraLatestScalarWhereWithAggregatesInput | CameraLatestScalarWhereWithAggregatesInput[]
    OR?: CameraLatestScalarWhereWithAggregatesInput[]
    NOT?: CameraLatestScalarWhereWithAggregatesInput | CameraLatestScalarWhereWithAggregatesInput[]
    deviceId?: UuidWithAggregatesFilter<"CameraLatest"> | string
    image?: BytesWithAggregatesFilter<"CameraLatest"> | Bytes
    capturedAt?: DateTimeWithAggregatesFilter<"CameraLatest"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CameraLatest"> | Date | string
  }

  export type SensorReadingWhereInput = {
    AND?: SensorReadingWhereInput | SensorReadingWhereInput[]
    OR?: SensorReadingWhereInput[]
    NOT?: SensorReadingWhereInput | SensorReadingWhereInput[]
    id?: BigIntFilter<"SensorReading"> | bigint | number
    deviceId?: UuidFilter<"SensorReading"> | string
    roomId?: UuidFilter<"SensorReading"> | string
    temperature?: FloatFilter<"SensorReading"> | number
    humidity?: FloatFilter<"SensorReading"> | number
    recordedAt?: DateTimeFilter<"SensorReading"> | Date | string
    device?: XOR<DeviceScalarRelationFilter, DeviceWhereInput>
  }

  export type SensorReadingOrderByWithRelationInput = {
    id?: SortOrder
    deviceId?: SortOrder
    roomId?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    recordedAt?: SortOrder
    device?: DeviceOrderByWithRelationInput
  }

  export type SensorReadingWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: SensorReadingWhereInput | SensorReadingWhereInput[]
    OR?: SensorReadingWhereInput[]
    NOT?: SensorReadingWhereInput | SensorReadingWhereInput[]
    deviceId?: UuidFilter<"SensorReading"> | string
    roomId?: UuidFilter<"SensorReading"> | string
    temperature?: FloatFilter<"SensorReading"> | number
    humidity?: FloatFilter<"SensorReading"> | number
    recordedAt?: DateTimeFilter<"SensorReading"> | Date | string
    device?: XOR<DeviceScalarRelationFilter, DeviceWhereInput>
  }, "id">

  export type SensorReadingOrderByWithAggregationInput = {
    id?: SortOrder
    deviceId?: SortOrder
    roomId?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    recordedAt?: SortOrder
    _count?: SensorReadingCountOrderByAggregateInput
    _avg?: SensorReadingAvgOrderByAggregateInput
    _max?: SensorReadingMaxOrderByAggregateInput
    _min?: SensorReadingMinOrderByAggregateInput
    _sum?: SensorReadingSumOrderByAggregateInput
  }

  export type SensorReadingScalarWhereWithAggregatesInput = {
    AND?: SensorReadingScalarWhereWithAggregatesInput | SensorReadingScalarWhereWithAggregatesInput[]
    OR?: SensorReadingScalarWhereWithAggregatesInput[]
    NOT?: SensorReadingScalarWhereWithAggregatesInput | SensorReadingScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"SensorReading"> | bigint | number
    deviceId?: UuidWithAggregatesFilter<"SensorReading"> | string
    roomId?: UuidWithAggregatesFilter<"SensorReading"> | string
    temperature?: FloatWithAggregatesFilter<"SensorReading"> | number
    humidity?: FloatWithAggregatesFilter<"SensorReading"> | number
    recordedAt?: DateTimeWithAggregatesFilter<"SensorReading"> | Date | string
  }

  export type RoomThresholdWhereInput = {
    AND?: RoomThresholdWhereInput | RoomThresholdWhereInput[]
    OR?: RoomThresholdWhereInput[]
    NOT?: RoomThresholdWhereInput | RoomThresholdWhereInput[]
    roomId?: UuidFilter<"RoomThreshold"> | string
    tempMin?: FloatNullableFilter<"RoomThreshold"> | number | null
    tempMax?: FloatNullableFilter<"RoomThreshold"> | number | null
    humMin?: FloatNullableFilter<"RoomThreshold"> | number | null
    humMax?: FloatNullableFilter<"RoomThreshold"> | number | null
    consecutiveCount?: IntFilter<"RoomThreshold"> | number
    tempState?: EnumMetricStateFilter<"RoomThreshold"> | $Enums.MetricState
    tempOutOfCount?: IntFilter<"RoomThreshold"> | number
    tempInCount?: IntFilter<"RoomThreshold"> | number
    humState?: EnumMetricStateFilter<"RoomThreshold"> | $Enums.MetricState
    humOutOfCount?: IntFilter<"RoomThreshold"> | number
    humInCount?: IntFilter<"RoomThreshold"> | number
    updatedAt?: DateTimeFilter<"RoomThreshold"> | Date | string
  }

  export type RoomThresholdOrderByWithRelationInput = {
    roomId?: SortOrder
    tempMin?: SortOrderInput | SortOrder
    tempMax?: SortOrderInput | SortOrder
    humMin?: SortOrderInput | SortOrder
    humMax?: SortOrderInput | SortOrder
    consecutiveCount?: SortOrder
    tempState?: SortOrder
    tempOutOfCount?: SortOrder
    tempInCount?: SortOrder
    humState?: SortOrder
    humOutOfCount?: SortOrder
    humInCount?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoomThresholdWhereUniqueInput = Prisma.AtLeast<{
    roomId?: string
    AND?: RoomThresholdWhereInput | RoomThresholdWhereInput[]
    OR?: RoomThresholdWhereInput[]
    NOT?: RoomThresholdWhereInput | RoomThresholdWhereInput[]
    tempMin?: FloatNullableFilter<"RoomThreshold"> | number | null
    tempMax?: FloatNullableFilter<"RoomThreshold"> | number | null
    humMin?: FloatNullableFilter<"RoomThreshold"> | number | null
    humMax?: FloatNullableFilter<"RoomThreshold"> | number | null
    consecutiveCount?: IntFilter<"RoomThreshold"> | number
    tempState?: EnumMetricStateFilter<"RoomThreshold"> | $Enums.MetricState
    tempOutOfCount?: IntFilter<"RoomThreshold"> | number
    tempInCount?: IntFilter<"RoomThreshold"> | number
    humState?: EnumMetricStateFilter<"RoomThreshold"> | $Enums.MetricState
    humOutOfCount?: IntFilter<"RoomThreshold"> | number
    humInCount?: IntFilter<"RoomThreshold"> | number
    updatedAt?: DateTimeFilter<"RoomThreshold"> | Date | string
  }, "roomId">

  export type RoomThresholdOrderByWithAggregationInput = {
    roomId?: SortOrder
    tempMin?: SortOrderInput | SortOrder
    tempMax?: SortOrderInput | SortOrder
    humMin?: SortOrderInput | SortOrder
    humMax?: SortOrderInput | SortOrder
    consecutiveCount?: SortOrder
    tempState?: SortOrder
    tempOutOfCount?: SortOrder
    tempInCount?: SortOrder
    humState?: SortOrder
    humOutOfCount?: SortOrder
    humInCount?: SortOrder
    updatedAt?: SortOrder
    _count?: RoomThresholdCountOrderByAggregateInput
    _avg?: RoomThresholdAvgOrderByAggregateInput
    _max?: RoomThresholdMaxOrderByAggregateInput
    _min?: RoomThresholdMinOrderByAggregateInput
    _sum?: RoomThresholdSumOrderByAggregateInput
  }

  export type RoomThresholdScalarWhereWithAggregatesInput = {
    AND?: RoomThresholdScalarWhereWithAggregatesInput | RoomThresholdScalarWhereWithAggregatesInput[]
    OR?: RoomThresholdScalarWhereWithAggregatesInput[]
    NOT?: RoomThresholdScalarWhereWithAggregatesInput | RoomThresholdScalarWhereWithAggregatesInput[]
    roomId?: UuidWithAggregatesFilter<"RoomThreshold"> | string
    tempMin?: FloatNullableWithAggregatesFilter<"RoomThreshold"> | number | null
    tempMax?: FloatNullableWithAggregatesFilter<"RoomThreshold"> | number | null
    humMin?: FloatNullableWithAggregatesFilter<"RoomThreshold"> | number | null
    humMax?: FloatNullableWithAggregatesFilter<"RoomThreshold"> | number | null
    consecutiveCount?: IntWithAggregatesFilter<"RoomThreshold"> | number
    tempState?: EnumMetricStateWithAggregatesFilter<"RoomThreshold"> | $Enums.MetricState
    tempOutOfCount?: IntWithAggregatesFilter<"RoomThreshold"> | number
    tempInCount?: IntWithAggregatesFilter<"RoomThreshold"> | number
    humState?: EnumMetricStateWithAggregatesFilter<"RoomThreshold"> | $Enums.MetricState
    humOutOfCount?: IntWithAggregatesFilter<"RoomThreshold"> | number
    humInCount?: IntWithAggregatesFilter<"RoomThreshold"> | number
    updatedAt?: DateTimeWithAggregatesFilter<"RoomThreshold"> | Date | string
  }

  export type PendingAlertWhereInput = {
    AND?: PendingAlertWhereInput | PendingAlertWhereInput[]
    OR?: PendingAlertWhereInput[]
    NOT?: PendingAlertWhereInput | PendingAlertWhereInput[]
    id?: UuidFilter<"PendingAlert"> | string
    dedupeKey?: StringFilter<"PendingAlert"> | string
    payload?: JsonFilter<"PendingAlert">
    attempts?: IntFilter<"PendingAlert"> | number
    sentAt?: DateTimeNullableFilter<"PendingAlert"> | Date | string | null
    createdAt?: DateTimeFilter<"PendingAlert"> | Date | string
  }

  export type PendingAlertOrderByWithRelationInput = {
    id?: SortOrder
    dedupeKey?: SortOrder
    payload?: SortOrder
    attempts?: SortOrder
    sentAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type PendingAlertWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    dedupeKey?: string
    AND?: PendingAlertWhereInput | PendingAlertWhereInput[]
    OR?: PendingAlertWhereInput[]
    NOT?: PendingAlertWhereInput | PendingAlertWhereInput[]
    payload?: JsonFilter<"PendingAlert">
    attempts?: IntFilter<"PendingAlert"> | number
    sentAt?: DateTimeNullableFilter<"PendingAlert"> | Date | string | null
    createdAt?: DateTimeFilter<"PendingAlert"> | Date | string
  }, "id" | "dedupeKey">

  export type PendingAlertOrderByWithAggregationInput = {
    id?: SortOrder
    dedupeKey?: SortOrder
    payload?: SortOrder
    attempts?: SortOrder
    sentAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: PendingAlertCountOrderByAggregateInput
    _avg?: PendingAlertAvgOrderByAggregateInput
    _max?: PendingAlertMaxOrderByAggregateInput
    _min?: PendingAlertMinOrderByAggregateInput
    _sum?: PendingAlertSumOrderByAggregateInput
  }

  export type PendingAlertScalarWhereWithAggregatesInput = {
    AND?: PendingAlertScalarWhereWithAggregatesInput | PendingAlertScalarWhereWithAggregatesInput[]
    OR?: PendingAlertScalarWhereWithAggregatesInput[]
    NOT?: PendingAlertScalarWhereWithAggregatesInput | PendingAlertScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"PendingAlert"> | string
    dedupeKey?: StringWithAggregatesFilter<"PendingAlert"> | string
    payload?: JsonWithAggregatesFilter<"PendingAlert">
    attempts?: IntWithAggregatesFilter<"PendingAlert"> | number
    sentAt?: DateTimeNullableWithAggregatesFilter<"PendingAlert"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"PendingAlert"> | Date | string
  }

  export type DeviceCreateInput = {
    id?: string
    roomId: string
    type: $Enums.DeviceType
    name: string
    apiKeyHash: string
    intervalSec: number
    isSimulated?: boolean
    status?: $Enums.DeviceStatus
    connectionState?: $Enums.ConnectionState
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    cameraLatest?: CameraLatestCreateNestedOneWithoutDeviceInput
    readings?: SensorReadingCreateNestedManyWithoutDeviceInput
  }

  export type DeviceUncheckedCreateInput = {
    id?: string
    roomId: string
    type: $Enums.DeviceType
    name: string
    apiKeyHash: string
    intervalSec: number
    isSimulated?: boolean
    status?: $Enums.DeviceStatus
    connectionState?: $Enums.ConnectionState
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    cameraLatest?: CameraLatestUncheckedCreateNestedOneWithoutDeviceInput
    readings?: SensorReadingUncheckedCreateNestedManyWithoutDeviceInput
  }

  export type DeviceUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    type?: EnumDeviceTypeFieldUpdateOperationsInput | $Enums.DeviceType
    name?: StringFieldUpdateOperationsInput | string
    apiKeyHash?: StringFieldUpdateOperationsInput | string
    intervalSec?: IntFieldUpdateOperationsInput | number
    isSimulated?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumDeviceStatusFieldUpdateOperationsInput | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFieldUpdateOperationsInput | $Enums.ConnectionState
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cameraLatest?: CameraLatestUpdateOneWithoutDeviceNestedInput
    readings?: SensorReadingUpdateManyWithoutDeviceNestedInput
  }

  export type DeviceUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    type?: EnumDeviceTypeFieldUpdateOperationsInput | $Enums.DeviceType
    name?: StringFieldUpdateOperationsInput | string
    apiKeyHash?: StringFieldUpdateOperationsInput | string
    intervalSec?: IntFieldUpdateOperationsInput | number
    isSimulated?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumDeviceStatusFieldUpdateOperationsInput | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFieldUpdateOperationsInput | $Enums.ConnectionState
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cameraLatest?: CameraLatestUncheckedUpdateOneWithoutDeviceNestedInput
    readings?: SensorReadingUncheckedUpdateManyWithoutDeviceNestedInput
  }

  export type DeviceCreateManyInput = {
    id?: string
    roomId: string
    type: $Enums.DeviceType
    name: string
    apiKeyHash: string
    intervalSec: number
    isSimulated?: boolean
    status?: $Enums.DeviceStatus
    connectionState?: $Enums.ConnectionState
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DeviceUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    type?: EnumDeviceTypeFieldUpdateOperationsInput | $Enums.DeviceType
    name?: StringFieldUpdateOperationsInput | string
    apiKeyHash?: StringFieldUpdateOperationsInput | string
    intervalSec?: IntFieldUpdateOperationsInput | number
    isSimulated?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumDeviceStatusFieldUpdateOperationsInput | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFieldUpdateOperationsInput | $Enums.ConnectionState
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    type?: EnumDeviceTypeFieldUpdateOperationsInput | $Enums.DeviceType
    name?: StringFieldUpdateOperationsInput | string
    apiKeyHash?: StringFieldUpdateOperationsInput | string
    intervalSec?: IntFieldUpdateOperationsInput | number
    isSimulated?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumDeviceStatusFieldUpdateOperationsInput | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFieldUpdateOperationsInput | $Enums.ConnectionState
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CameraLatestCreateInput = {
    image: Bytes
    capturedAt: Date | string
    updatedAt?: Date | string
    device: DeviceCreateNestedOneWithoutCameraLatestInput
  }

  export type CameraLatestUncheckedCreateInput = {
    deviceId: string
    image: Bytes
    capturedAt: Date | string
    updatedAt?: Date | string
  }

  export type CameraLatestUpdateInput = {
    image?: BytesFieldUpdateOperationsInput | Bytes
    capturedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    device?: DeviceUpdateOneRequiredWithoutCameraLatestNestedInput
  }

  export type CameraLatestUncheckedUpdateInput = {
    deviceId?: StringFieldUpdateOperationsInput | string
    image?: BytesFieldUpdateOperationsInput | Bytes
    capturedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CameraLatestCreateManyInput = {
    deviceId: string
    image: Bytes
    capturedAt: Date | string
    updatedAt?: Date | string
  }

  export type CameraLatestUpdateManyMutationInput = {
    image?: BytesFieldUpdateOperationsInput | Bytes
    capturedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CameraLatestUncheckedUpdateManyInput = {
    deviceId?: StringFieldUpdateOperationsInput | string
    image?: BytesFieldUpdateOperationsInput | Bytes
    capturedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SensorReadingCreateInput = {
    id?: bigint | number
    roomId: string
    temperature: number
    humidity: number
    recordedAt?: Date | string
    device: DeviceCreateNestedOneWithoutReadingsInput
  }

  export type SensorReadingUncheckedCreateInput = {
    id?: bigint | number
    deviceId: string
    roomId: string
    temperature: number
    humidity: number
    recordedAt?: Date | string
  }

  export type SensorReadingUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    roomId?: StringFieldUpdateOperationsInput | string
    temperature?: FloatFieldUpdateOperationsInput | number
    humidity?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    device?: DeviceUpdateOneRequiredWithoutReadingsNestedInput
  }

  export type SensorReadingUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    deviceId?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    temperature?: FloatFieldUpdateOperationsInput | number
    humidity?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SensorReadingCreateManyInput = {
    id?: bigint | number
    deviceId: string
    roomId: string
    temperature: number
    humidity: number
    recordedAt?: Date | string
  }

  export type SensorReadingUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    roomId?: StringFieldUpdateOperationsInput | string
    temperature?: FloatFieldUpdateOperationsInput | number
    humidity?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SensorReadingUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    deviceId?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    temperature?: FloatFieldUpdateOperationsInput | number
    humidity?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoomThresholdCreateInput = {
    roomId: string
    tempMin?: number | null
    tempMax?: number | null
    humMin?: number | null
    humMax?: number | null
    consecutiveCount?: number
    tempState?: $Enums.MetricState
    tempOutOfCount?: number
    tempInCount?: number
    humState?: $Enums.MetricState
    humOutOfCount?: number
    humInCount?: number
    updatedAt?: Date | string
  }

  export type RoomThresholdUncheckedCreateInput = {
    roomId: string
    tempMin?: number | null
    tempMax?: number | null
    humMin?: number | null
    humMax?: number | null
    consecutiveCount?: number
    tempState?: $Enums.MetricState
    tempOutOfCount?: number
    tempInCount?: number
    humState?: $Enums.MetricState
    humOutOfCount?: number
    humInCount?: number
    updatedAt?: Date | string
  }

  export type RoomThresholdUpdateInput = {
    roomId?: StringFieldUpdateOperationsInput | string
    tempMin?: NullableFloatFieldUpdateOperationsInput | number | null
    tempMax?: NullableFloatFieldUpdateOperationsInput | number | null
    humMin?: NullableFloatFieldUpdateOperationsInput | number | null
    humMax?: NullableFloatFieldUpdateOperationsInput | number | null
    consecutiveCount?: IntFieldUpdateOperationsInput | number
    tempState?: EnumMetricStateFieldUpdateOperationsInput | $Enums.MetricState
    tempOutOfCount?: IntFieldUpdateOperationsInput | number
    tempInCount?: IntFieldUpdateOperationsInput | number
    humState?: EnumMetricStateFieldUpdateOperationsInput | $Enums.MetricState
    humOutOfCount?: IntFieldUpdateOperationsInput | number
    humInCount?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoomThresholdUncheckedUpdateInput = {
    roomId?: StringFieldUpdateOperationsInput | string
    tempMin?: NullableFloatFieldUpdateOperationsInput | number | null
    tempMax?: NullableFloatFieldUpdateOperationsInput | number | null
    humMin?: NullableFloatFieldUpdateOperationsInput | number | null
    humMax?: NullableFloatFieldUpdateOperationsInput | number | null
    consecutiveCount?: IntFieldUpdateOperationsInput | number
    tempState?: EnumMetricStateFieldUpdateOperationsInput | $Enums.MetricState
    tempOutOfCount?: IntFieldUpdateOperationsInput | number
    tempInCount?: IntFieldUpdateOperationsInput | number
    humState?: EnumMetricStateFieldUpdateOperationsInput | $Enums.MetricState
    humOutOfCount?: IntFieldUpdateOperationsInput | number
    humInCount?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoomThresholdCreateManyInput = {
    roomId: string
    tempMin?: number | null
    tempMax?: number | null
    humMin?: number | null
    humMax?: number | null
    consecutiveCount?: number
    tempState?: $Enums.MetricState
    tempOutOfCount?: number
    tempInCount?: number
    humState?: $Enums.MetricState
    humOutOfCount?: number
    humInCount?: number
    updatedAt?: Date | string
  }

  export type RoomThresholdUpdateManyMutationInput = {
    roomId?: StringFieldUpdateOperationsInput | string
    tempMin?: NullableFloatFieldUpdateOperationsInput | number | null
    tempMax?: NullableFloatFieldUpdateOperationsInput | number | null
    humMin?: NullableFloatFieldUpdateOperationsInput | number | null
    humMax?: NullableFloatFieldUpdateOperationsInput | number | null
    consecutiveCount?: IntFieldUpdateOperationsInput | number
    tempState?: EnumMetricStateFieldUpdateOperationsInput | $Enums.MetricState
    tempOutOfCount?: IntFieldUpdateOperationsInput | number
    tempInCount?: IntFieldUpdateOperationsInput | number
    humState?: EnumMetricStateFieldUpdateOperationsInput | $Enums.MetricState
    humOutOfCount?: IntFieldUpdateOperationsInput | number
    humInCount?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoomThresholdUncheckedUpdateManyInput = {
    roomId?: StringFieldUpdateOperationsInput | string
    tempMin?: NullableFloatFieldUpdateOperationsInput | number | null
    tempMax?: NullableFloatFieldUpdateOperationsInput | number | null
    humMin?: NullableFloatFieldUpdateOperationsInput | number | null
    humMax?: NullableFloatFieldUpdateOperationsInput | number | null
    consecutiveCount?: IntFieldUpdateOperationsInput | number
    tempState?: EnumMetricStateFieldUpdateOperationsInput | $Enums.MetricState
    tempOutOfCount?: IntFieldUpdateOperationsInput | number
    tempInCount?: IntFieldUpdateOperationsInput | number
    humState?: EnumMetricStateFieldUpdateOperationsInput | $Enums.MetricState
    humOutOfCount?: IntFieldUpdateOperationsInput | number
    humInCount?: IntFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PendingAlertCreateInput = {
    id?: string
    dedupeKey: string
    payload: JsonNullValueInput | InputJsonValue
    attempts?: number
    sentAt?: Date | string | null
    createdAt?: Date | string
  }

  export type PendingAlertUncheckedCreateInput = {
    id?: string
    dedupeKey: string
    payload: JsonNullValueInput | InputJsonValue
    attempts?: number
    sentAt?: Date | string | null
    createdAt?: Date | string
  }

  export type PendingAlertUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    dedupeKey?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    attempts?: IntFieldUpdateOperationsInput | number
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PendingAlertUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    dedupeKey?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    attempts?: IntFieldUpdateOperationsInput | number
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PendingAlertCreateManyInput = {
    id?: string
    dedupeKey: string
    payload: JsonNullValueInput | InputJsonValue
    attempts?: number
    sentAt?: Date | string | null
    createdAt?: Date | string
  }

  export type PendingAlertUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    dedupeKey?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    attempts?: IntFieldUpdateOperationsInput | number
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PendingAlertUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    dedupeKey?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    attempts?: IntFieldUpdateOperationsInput | number
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type EnumDeviceTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.DeviceType | EnumDeviceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.DeviceType[] | ListEnumDeviceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.DeviceType[] | ListEnumDeviceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumDeviceTypeFilter<$PrismaModel> | $Enums.DeviceType
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type EnumDeviceStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.DeviceStatus | EnumDeviceStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DeviceStatus[] | ListEnumDeviceStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DeviceStatus[] | ListEnumDeviceStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDeviceStatusFilter<$PrismaModel> | $Enums.DeviceStatus
  }

  export type EnumConnectionStateFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectionState | EnumConnectionStateFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectionState[] | ListEnumConnectionStateFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectionState[] | ListEnumConnectionStateFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectionStateFilter<$PrismaModel> | $Enums.ConnectionState
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type CameraLatestNullableScalarRelationFilter = {
    is?: CameraLatestWhereInput | null
    isNot?: CameraLatestWhereInput | null
  }

  export type SensorReadingListRelationFilter = {
    every?: SensorReadingWhereInput
    some?: SensorReadingWhereInput
    none?: SensorReadingWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SensorReadingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DeviceCountOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    type?: SortOrder
    name?: SortOrder
    apiKeyHash?: SortOrder
    intervalSec?: SortOrder
    isSimulated?: SortOrder
    status?: SortOrder
    connectionState?: SortOrder
    lastSeen?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DeviceAvgOrderByAggregateInput = {
    intervalSec?: SortOrder
  }

  export type DeviceMaxOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    type?: SortOrder
    name?: SortOrder
    apiKeyHash?: SortOrder
    intervalSec?: SortOrder
    isSimulated?: SortOrder
    status?: SortOrder
    connectionState?: SortOrder
    lastSeen?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DeviceMinOrderByAggregateInput = {
    id?: SortOrder
    roomId?: SortOrder
    type?: SortOrder
    name?: SortOrder
    apiKeyHash?: SortOrder
    intervalSec?: SortOrder
    isSimulated?: SortOrder
    status?: SortOrder
    connectionState?: SortOrder
    lastSeen?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DeviceSumOrderByAggregateInput = {
    intervalSec?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumDeviceTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DeviceType | EnumDeviceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.DeviceType[] | ListEnumDeviceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.DeviceType[] | ListEnumDeviceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumDeviceTypeWithAggregatesFilter<$PrismaModel> | $Enums.DeviceType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDeviceTypeFilter<$PrismaModel>
    _max?: NestedEnumDeviceTypeFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumDeviceStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DeviceStatus | EnumDeviceStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DeviceStatus[] | ListEnumDeviceStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DeviceStatus[] | ListEnumDeviceStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDeviceStatusWithAggregatesFilter<$PrismaModel> | $Enums.DeviceStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDeviceStatusFilter<$PrismaModel>
    _max?: NestedEnumDeviceStatusFilter<$PrismaModel>
  }

  export type EnumConnectionStateWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectionState | EnumConnectionStateFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectionState[] | ListEnumConnectionStateFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectionState[] | ListEnumConnectionStateFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectionStateWithAggregatesFilter<$PrismaModel> | $Enums.ConnectionState
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectionStateFilter<$PrismaModel>
    _max?: NestedEnumConnectionStateFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type BytesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesFilter<$PrismaModel> | Bytes
  }

  export type DeviceScalarRelationFilter = {
    is?: DeviceWhereInput
    isNot?: DeviceWhereInput
  }

  export type CameraLatestCountOrderByAggregateInput = {
    deviceId?: SortOrder
    image?: SortOrder
    capturedAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CameraLatestMaxOrderByAggregateInput = {
    deviceId?: SortOrder
    image?: SortOrder
    capturedAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CameraLatestMinOrderByAggregateInput = {
    deviceId?: SortOrder
    image?: SortOrder
    capturedAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BytesWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesWithAggregatesFilter<$PrismaModel> | Bytes
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBytesFilter<$PrismaModel>
    _max?: NestedBytesFilter<$PrismaModel>
  }

  export type BigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type SensorReadingCountOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    roomId?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    recordedAt?: SortOrder
  }

  export type SensorReadingAvgOrderByAggregateInput = {
    id?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
  }

  export type SensorReadingMaxOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    roomId?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    recordedAt?: SortOrder
  }

  export type SensorReadingMinOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    roomId?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    recordedAt?: SortOrder
  }

  export type SensorReadingSumOrderByAggregateInput = {
    id?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
  }

  export type BigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type EnumMetricStateFilter<$PrismaModel = never> = {
    equals?: $Enums.MetricState | EnumMetricStateFieldRefInput<$PrismaModel>
    in?: $Enums.MetricState[] | ListEnumMetricStateFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetricState[] | ListEnumMetricStateFieldRefInput<$PrismaModel>
    not?: NestedEnumMetricStateFilter<$PrismaModel> | $Enums.MetricState
  }

  export type RoomThresholdCountOrderByAggregateInput = {
    roomId?: SortOrder
    tempMin?: SortOrder
    tempMax?: SortOrder
    humMin?: SortOrder
    humMax?: SortOrder
    consecutiveCount?: SortOrder
    tempState?: SortOrder
    tempOutOfCount?: SortOrder
    tempInCount?: SortOrder
    humState?: SortOrder
    humOutOfCount?: SortOrder
    humInCount?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoomThresholdAvgOrderByAggregateInput = {
    tempMin?: SortOrder
    tempMax?: SortOrder
    humMin?: SortOrder
    humMax?: SortOrder
    consecutiveCount?: SortOrder
    tempOutOfCount?: SortOrder
    tempInCount?: SortOrder
    humOutOfCount?: SortOrder
    humInCount?: SortOrder
  }

  export type RoomThresholdMaxOrderByAggregateInput = {
    roomId?: SortOrder
    tempMin?: SortOrder
    tempMax?: SortOrder
    humMin?: SortOrder
    humMax?: SortOrder
    consecutiveCount?: SortOrder
    tempState?: SortOrder
    tempOutOfCount?: SortOrder
    tempInCount?: SortOrder
    humState?: SortOrder
    humOutOfCount?: SortOrder
    humInCount?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoomThresholdMinOrderByAggregateInput = {
    roomId?: SortOrder
    tempMin?: SortOrder
    tempMax?: SortOrder
    humMin?: SortOrder
    humMax?: SortOrder
    consecutiveCount?: SortOrder
    tempState?: SortOrder
    tempOutOfCount?: SortOrder
    tempInCount?: SortOrder
    humState?: SortOrder
    humOutOfCount?: SortOrder
    humInCount?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoomThresholdSumOrderByAggregateInput = {
    tempMin?: SortOrder
    tempMax?: SortOrder
    humMin?: SortOrder
    humMax?: SortOrder
    consecutiveCount?: SortOrder
    tempOutOfCount?: SortOrder
    tempInCount?: SortOrder
    humOutOfCount?: SortOrder
    humInCount?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type EnumMetricStateWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MetricState | EnumMetricStateFieldRefInput<$PrismaModel>
    in?: $Enums.MetricState[] | ListEnumMetricStateFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetricState[] | ListEnumMetricStateFieldRefInput<$PrismaModel>
    not?: NestedEnumMetricStateWithAggregatesFilter<$PrismaModel> | $Enums.MetricState
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMetricStateFilter<$PrismaModel>
    _max?: NestedEnumMetricStateFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type PendingAlertCountOrderByAggregateInput = {
    id?: SortOrder
    dedupeKey?: SortOrder
    payload?: SortOrder
    attempts?: SortOrder
    sentAt?: SortOrder
    createdAt?: SortOrder
  }

  export type PendingAlertAvgOrderByAggregateInput = {
    attempts?: SortOrder
  }

  export type PendingAlertMaxOrderByAggregateInput = {
    id?: SortOrder
    dedupeKey?: SortOrder
    attempts?: SortOrder
    sentAt?: SortOrder
    createdAt?: SortOrder
  }

  export type PendingAlertMinOrderByAggregateInput = {
    id?: SortOrder
    dedupeKey?: SortOrder
    attempts?: SortOrder
    sentAt?: SortOrder
    createdAt?: SortOrder
  }

  export type PendingAlertSumOrderByAggregateInput = {
    attempts?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type CameraLatestCreateNestedOneWithoutDeviceInput = {
    create?: XOR<CameraLatestCreateWithoutDeviceInput, CameraLatestUncheckedCreateWithoutDeviceInput>
    connectOrCreate?: CameraLatestCreateOrConnectWithoutDeviceInput
    connect?: CameraLatestWhereUniqueInput
  }

  export type SensorReadingCreateNestedManyWithoutDeviceInput = {
    create?: XOR<SensorReadingCreateWithoutDeviceInput, SensorReadingUncheckedCreateWithoutDeviceInput> | SensorReadingCreateWithoutDeviceInput[] | SensorReadingUncheckedCreateWithoutDeviceInput[]
    connectOrCreate?: SensorReadingCreateOrConnectWithoutDeviceInput | SensorReadingCreateOrConnectWithoutDeviceInput[]
    createMany?: SensorReadingCreateManyDeviceInputEnvelope
    connect?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
  }

  export type CameraLatestUncheckedCreateNestedOneWithoutDeviceInput = {
    create?: XOR<CameraLatestCreateWithoutDeviceInput, CameraLatestUncheckedCreateWithoutDeviceInput>
    connectOrCreate?: CameraLatestCreateOrConnectWithoutDeviceInput
    connect?: CameraLatestWhereUniqueInput
  }

  export type SensorReadingUncheckedCreateNestedManyWithoutDeviceInput = {
    create?: XOR<SensorReadingCreateWithoutDeviceInput, SensorReadingUncheckedCreateWithoutDeviceInput> | SensorReadingCreateWithoutDeviceInput[] | SensorReadingUncheckedCreateWithoutDeviceInput[]
    connectOrCreate?: SensorReadingCreateOrConnectWithoutDeviceInput | SensorReadingCreateOrConnectWithoutDeviceInput[]
    createMany?: SensorReadingCreateManyDeviceInputEnvelope
    connect?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumDeviceTypeFieldUpdateOperationsInput = {
    set?: $Enums.DeviceType
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type EnumDeviceStatusFieldUpdateOperationsInput = {
    set?: $Enums.DeviceStatus
  }

  export type EnumConnectionStateFieldUpdateOperationsInput = {
    set?: $Enums.ConnectionState
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type CameraLatestUpdateOneWithoutDeviceNestedInput = {
    create?: XOR<CameraLatestCreateWithoutDeviceInput, CameraLatestUncheckedCreateWithoutDeviceInput>
    connectOrCreate?: CameraLatestCreateOrConnectWithoutDeviceInput
    upsert?: CameraLatestUpsertWithoutDeviceInput
    disconnect?: CameraLatestWhereInput | boolean
    delete?: CameraLatestWhereInput | boolean
    connect?: CameraLatestWhereUniqueInput
    update?: XOR<XOR<CameraLatestUpdateToOneWithWhereWithoutDeviceInput, CameraLatestUpdateWithoutDeviceInput>, CameraLatestUncheckedUpdateWithoutDeviceInput>
  }

  export type SensorReadingUpdateManyWithoutDeviceNestedInput = {
    create?: XOR<SensorReadingCreateWithoutDeviceInput, SensorReadingUncheckedCreateWithoutDeviceInput> | SensorReadingCreateWithoutDeviceInput[] | SensorReadingUncheckedCreateWithoutDeviceInput[]
    connectOrCreate?: SensorReadingCreateOrConnectWithoutDeviceInput | SensorReadingCreateOrConnectWithoutDeviceInput[]
    upsert?: SensorReadingUpsertWithWhereUniqueWithoutDeviceInput | SensorReadingUpsertWithWhereUniqueWithoutDeviceInput[]
    createMany?: SensorReadingCreateManyDeviceInputEnvelope
    set?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
    disconnect?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
    delete?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
    connect?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
    update?: SensorReadingUpdateWithWhereUniqueWithoutDeviceInput | SensorReadingUpdateWithWhereUniqueWithoutDeviceInput[]
    updateMany?: SensorReadingUpdateManyWithWhereWithoutDeviceInput | SensorReadingUpdateManyWithWhereWithoutDeviceInput[]
    deleteMany?: SensorReadingScalarWhereInput | SensorReadingScalarWhereInput[]
  }

  export type CameraLatestUncheckedUpdateOneWithoutDeviceNestedInput = {
    create?: XOR<CameraLatestCreateWithoutDeviceInput, CameraLatestUncheckedCreateWithoutDeviceInput>
    connectOrCreate?: CameraLatestCreateOrConnectWithoutDeviceInput
    upsert?: CameraLatestUpsertWithoutDeviceInput
    disconnect?: CameraLatestWhereInput | boolean
    delete?: CameraLatestWhereInput | boolean
    connect?: CameraLatestWhereUniqueInput
    update?: XOR<XOR<CameraLatestUpdateToOneWithWhereWithoutDeviceInput, CameraLatestUpdateWithoutDeviceInput>, CameraLatestUncheckedUpdateWithoutDeviceInput>
  }

  export type SensorReadingUncheckedUpdateManyWithoutDeviceNestedInput = {
    create?: XOR<SensorReadingCreateWithoutDeviceInput, SensorReadingUncheckedCreateWithoutDeviceInput> | SensorReadingCreateWithoutDeviceInput[] | SensorReadingUncheckedCreateWithoutDeviceInput[]
    connectOrCreate?: SensorReadingCreateOrConnectWithoutDeviceInput | SensorReadingCreateOrConnectWithoutDeviceInput[]
    upsert?: SensorReadingUpsertWithWhereUniqueWithoutDeviceInput | SensorReadingUpsertWithWhereUniqueWithoutDeviceInput[]
    createMany?: SensorReadingCreateManyDeviceInputEnvelope
    set?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
    disconnect?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
    delete?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
    connect?: SensorReadingWhereUniqueInput | SensorReadingWhereUniqueInput[]
    update?: SensorReadingUpdateWithWhereUniqueWithoutDeviceInput | SensorReadingUpdateWithWhereUniqueWithoutDeviceInput[]
    updateMany?: SensorReadingUpdateManyWithWhereWithoutDeviceInput | SensorReadingUpdateManyWithWhereWithoutDeviceInput[]
    deleteMany?: SensorReadingScalarWhereInput | SensorReadingScalarWhereInput[]
  }

  export type DeviceCreateNestedOneWithoutCameraLatestInput = {
    create?: XOR<DeviceCreateWithoutCameraLatestInput, DeviceUncheckedCreateWithoutCameraLatestInput>
    connectOrCreate?: DeviceCreateOrConnectWithoutCameraLatestInput
    connect?: DeviceWhereUniqueInput
  }

  export type BytesFieldUpdateOperationsInput = {
    set?: Bytes
  }

  export type DeviceUpdateOneRequiredWithoutCameraLatestNestedInput = {
    create?: XOR<DeviceCreateWithoutCameraLatestInput, DeviceUncheckedCreateWithoutCameraLatestInput>
    connectOrCreate?: DeviceCreateOrConnectWithoutCameraLatestInput
    upsert?: DeviceUpsertWithoutCameraLatestInput
    connect?: DeviceWhereUniqueInput
    update?: XOR<XOR<DeviceUpdateToOneWithWhereWithoutCameraLatestInput, DeviceUpdateWithoutCameraLatestInput>, DeviceUncheckedUpdateWithoutCameraLatestInput>
  }

  export type DeviceCreateNestedOneWithoutReadingsInput = {
    create?: XOR<DeviceCreateWithoutReadingsInput, DeviceUncheckedCreateWithoutReadingsInput>
    connectOrCreate?: DeviceCreateOrConnectWithoutReadingsInput
    connect?: DeviceWhereUniqueInput
  }

  export type BigIntFieldUpdateOperationsInput = {
    set?: bigint | number
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DeviceUpdateOneRequiredWithoutReadingsNestedInput = {
    create?: XOR<DeviceCreateWithoutReadingsInput, DeviceUncheckedCreateWithoutReadingsInput>
    connectOrCreate?: DeviceCreateOrConnectWithoutReadingsInput
    upsert?: DeviceUpsertWithoutReadingsInput
    connect?: DeviceWhereUniqueInput
    update?: XOR<XOR<DeviceUpdateToOneWithWhereWithoutReadingsInput, DeviceUpdateWithoutReadingsInput>, DeviceUncheckedUpdateWithoutReadingsInput>
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumMetricStateFieldUpdateOperationsInput = {
    set?: $Enums.MetricState
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedEnumDeviceTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.DeviceType | EnumDeviceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.DeviceType[] | ListEnumDeviceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.DeviceType[] | ListEnumDeviceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumDeviceTypeFilter<$PrismaModel> | $Enums.DeviceType
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumDeviceStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.DeviceStatus | EnumDeviceStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DeviceStatus[] | ListEnumDeviceStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DeviceStatus[] | ListEnumDeviceStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDeviceStatusFilter<$PrismaModel> | $Enums.DeviceStatus
  }

  export type NestedEnumConnectionStateFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectionState | EnumConnectionStateFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectionState[] | ListEnumConnectionStateFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectionState[] | ListEnumConnectionStateFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectionStateFilter<$PrismaModel> | $Enums.ConnectionState
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedEnumDeviceTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DeviceType | EnumDeviceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.DeviceType[] | ListEnumDeviceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.DeviceType[] | ListEnumDeviceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumDeviceTypeWithAggregatesFilter<$PrismaModel> | $Enums.DeviceType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDeviceTypeFilter<$PrismaModel>
    _max?: NestedEnumDeviceTypeFilter<$PrismaModel>
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumDeviceStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DeviceStatus | EnumDeviceStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DeviceStatus[] | ListEnumDeviceStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DeviceStatus[] | ListEnumDeviceStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDeviceStatusWithAggregatesFilter<$PrismaModel> | $Enums.DeviceStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDeviceStatusFilter<$PrismaModel>
    _max?: NestedEnumDeviceStatusFilter<$PrismaModel>
  }

  export type NestedEnumConnectionStateWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectionState | EnumConnectionStateFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectionState[] | ListEnumConnectionStateFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectionState[] | ListEnumConnectionStateFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectionStateWithAggregatesFilter<$PrismaModel> | $Enums.ConnectionState
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectionStateFilter<$PrismaModel>
    _max?: NestedEnumConnectionStateFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBytesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesFilter<$PrismaModel> | Bytes
  }

  export type NestedBytesWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesWithAggregatesFilter<$PrismaModel> | Bytes
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBytesFilter<$PrismaModel>
    _max?: NestedBytesFilter<$PrismaModel>
  }

  export type NestedBigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type NestedBigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumMetricStateFilter<$PrismaModel = never> = {
    equals?: $Enums.MetricState | EnumMetricStateFieldRefInput<$PrismaModel>
    in?: $Enums.MetricState[] | ListEnumMetricStateFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetricState[] | ListEnumMetricStateFieldRefInput<$PrismaModel>
    not?: NestedEnumMetricStateFilter<$PrismaModel> | $Enums.MetricState
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedEnumMetricStateWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MetricState | EnumMetricStateFieldRefInput<$PrismaModel>
    in?: $Enums.MetricState[] | ListEnumMetricStateFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetricState[] | ListEnumMetricStateFieldRefInput<$PrismaModel>
    not?: NestedEnumMetricStateWithAggregatesFilter<$PrismaModel> | $Enums.MetricState
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMetricStateFilter<$PrismaModel>
    _max?: NestedEnumMetricStateFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type CameraLatestCreateWithoutDeviceInput = {
    image: Bytes
    capturedAt: Date | string
    updatedAt?: Date | string
  }

  export type CameraLatestUncheckedCreateWithoutDeviceInput = {
    image: Bytes
    capturedAt: Date | string
    updatedAt?: Date | string
  }

  export type CameraLatestCreateOrConnectWithoutDeviceInput = {
    where: CameraLatestWhereUniqueInput
    create: XOR<CameraLatestCreateWithoutDeviceInput, CameraLatestUncheckedCreateWithoutDeviceInput>
  }

  export type SensorReadingCreateWithoutDeviceInput = {
    id?: bigint | number
    roomId: string
    temperature: number
    humidity: number
    recordedAt?: Date | string
  }

  export type SensorReadingUncheckedCreateWithoutDeviceInput = {
    id?: bigint | number
    roomId: string
    temperature: number
    humidity: number
    recordedAt?: Date | string
  }

  export type SensorReadingCreateOrConnectWithoutDeviceInput = {
    where: SensorReadingWhereUniqueInput
    create: XOR<SensorReadingCreateWithoutDeviceInput, SensorReadingUncheckedCreateWithoutDeviceInput>
  }

  export type SensorReadingCreateManyDeviceInputEnvelope = {
    data: SensorReadingCreateManyDeviceInput | SensorReadingCreateManyDeviceInput[]
    skipDuplicates?: boolean
  }

  export type CameraLatestUpsertWithoutDeviceInput = {
    update: XOR<CameraLatestUpdateWithoutDeviceInput, CameraLatestUncheckedUpdateWithoutDeviceInput>
    create: XOR<CameraLatestCreateWithoutDeviceInput, CameraLatestUncheckedCreateWithoutDeviceInput>
    where?: CameraLatestWhereInput
  }

  export type CameraLatestUpdateToOneWithWhereWithoutDeviceInput = {
    where?: CameraLatestWhereInput
    data: XOR<CameraLatestUpdateWithoutDeviceInput, CameraLatestUncheckedUpdateWithoutDeviceInput>
  }

  export type CameraLatestUpdateWithoutDeviceInput = {
    image?: BytesFieldUpdateOperationsInput | Bytes
    capturedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CameraLatestUncheckedUpdateWithoutDeviceInput = {
    image?: BytesFieldUpdateOperationsInput | Bytes
    capturedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SensorReadingUpsertWithWhereUniqueWithoutDeviceInput = {
    where: SensorReadingWhereUniqueInput
    update: XOR<SensorReadingUpdateWithoutDeviceInput, SensorReadingUncheckedUpdateWithoutDeviceInput>
    create: XOR<SensorReadingCreateWithoutDeviceInput, SensorReadingUncheckedCreateWithoutDeviceInput>
  }

  export type SensorReadingUpdateWithWhereUniqueWithoutDeviceInput = {
    where: SensorReadingWhereUniqueInput
    data: XOR<SensorReadingUpdateWithoutDeviceInput, SensorReadingUncheckedUpdateWithoutDeviceInput>
  }

  export type SensorReadingUpdateManyWithWhereWithoutDeviceInput = {
    where: SensorReadingScalarWhereInput
    data: XOR<SensorReadingUpdateManyMutationInput, SensorReadingUncheckedUpdateManyWithoutDeviceInput>
  }

  export type SensorReadingScalarWhereInput = {
    AND?: SensorReadingScalarWhereInput | SensorReadingScalarWhereInput[]
    OR?: SensorReadingScalarWhereInput[]
    NOT?: SensorReadingScalarWhereInput | SensorReadingScalarWhereInput[]
    id?: BigIntFilter<"SensorReading"> | bigint | number
    deviceId?: UuidFilter<"SensorReading"> | string
    roomId?: UuidFilter<"SensorReading"> | string
    temperature?: FloatFilter<"SensorReading"> | number
    humidity?: FloatFilter<"SensorReading"> | number
    recordedAt?: DateTimeFilter<"SensorReading"> | Date | string
  }

  export type DeviceCreateWithoutCameraLatestInput = {
    id?: string
    roomId: string
    type: $Enums.DeviceType
    name: string
    apiKeyHash: string
    intervalSec: number
    isSimulated?: boolean
    status?: $Enums.DeviceStatus
    connectionState?: $Enums.ConnectionState
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readings?: SensorReadingCreateNestedManyWithoutDeviceInput
  }

  export type DeviceUncheckedCreateWithoutCameraLatestInput = {
    id?: string
    roomId: string
    type: $Enums.DeviceType
    name: string
    apiKeyHash: string
    intervalSec: number
    isSimulated?: boolean
    status?: $Enums.DeviceStatus
    connectionState?: $Enums.ConnectionState
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readings?: SensorReadingUncheckedCreateNestedManyWithoutDeviceInput
  }

  export type DeviceCreateOrConnectWithoutCameraLatestInput = {
    where: DeviceWhereUniqueInput
    create: XOR<DeviceCreateWithoutCameraLatestInput, DeviceUncheckedCreateWithoutCameraLatestInput>
  }

  export type DeviceUpsertWithoutCameraLatestInput = {
    update: XOR<DeviceUpdateWithoutCameraLatestInput, DeviceUncheckedUpdateWithoutCameraLatestInput>
    create: XOR<DeviceCreateWithoutCameraLatestInput, DeviceUncheckedCreateWithoutCameraLatestInput>
    where?: DeviceWhereInput
  }

  export type DeviceUpdateToOneWithWhereWithoutCameraLatestInput = {
    where?: DeviceWhereInput
    data: XOR<DeviceUpdateWithoutCameraLatestInput, DeviceUncheckedUpdateWithoutCameraLatestInput>
  }

  export type DeviceUpdateWithoutCameraLatestInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    type?: EnumDeviceTypeFieldUpdateOperationsInput | $Enums.DeviceType
    name?: StringFieldUpdateOperationsInput | string
    apiKeyHash?: StringFieldUpdateOperationsInput | string
    intervalSec?: IntFieldUpdateOperationsInput | number
    isSimulated?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumDeviceStatusFieldUpdateOperationsInput | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFieldUpdateOperationsInput | $Enums.ConnectionState
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readings?: SensorReadingUpdateManyWithoutDeviceNestedInput
  }

  export type DeviceUncheckedUpdateWithoutCameraLatestInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    type?: EnumDeviceTypeFieldUpdateOperationsInput | $Enums.DeviceType
    name?: StringFieldUpdateOperationsInput | string
    apiKeyHash?: StringFieldUpdateOperationsInput | string
    intervalSec?: IntFieldUpdateOperationsInput | number
    isSimulated?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumDeviceStatusFieldUpdateOperationsInput | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFieldUpdateOperationsInput | $Enums.ConnectionState
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readings?: SensorReadingUncheckedUpdateManyWithoutDeviceNestedInput
  }

  export type DeviceCreateWithoutReadingsInput = {
    id?: string
    roomId: string
    type: $Enums.DeviceType
    name: string
    apiKeyHash: string
    intervalSec: number
    isSimulated?: boolean
    status?: $Enums.DeviceStatus
    connectionState?: $Enums.ConnectionState
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    cameraLatest?: CameraLatestCreateNestedOneWithoutDeviceInput
  }

  export type DeviceUncheckedCreateWithoutReadingsInput = {
    id?: string
    roomId: string
    type: $Enums.DeviceType
    name: string
    apiKeyHash: string
    intervalSec: number
    isSimulated?: boolean
    status?: $Enums.DeviceStatus
    connectionState?: $Enums.ConnectionState
    lastSeen?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    cameraLatest?: CameraLatestUncheckedCreateNestedOneWithoutDeviceInput
  }

  export type DeviceCreateOrConnectWithoutReadingsInput = {
    where: DeviceWhereUniqueInput
    create: XOR<DeviceCreateWithoutReadingsInput, DeviceUncheckedCreateWithoutReadingsInput>
  }

  export type DeviceUpsertWithoutReadingsInput = {
    update: XOR<DeviceUpdateWithoutReadingsInput, DeviceUncheckedUpdateWithoutReadingsInput>
    create: XOR<DeviceCreateWithoutReadingsInput, DeviceUncheckedCreateWithoutReadingsInput>
    where?: DeviceWhereInput
  }

  export type DeviceUpdateToOneWithWhereWithoutReadingsInput = {
    where?: DeviceWhereInput
    data: XOR<DeviceUpdateWithoutReadingsInput, DeviceUncheckedUpdateWithoutReadingsInput>
  }

  export type DeviceUpdateWithoutReadingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    type?: EnumDeviceTypeFieldUpdateOperationsInput | $Enums.DeviceType
    name?: StringFieldUpdateOperationsInput | string
    apiKeyHash?: StringFieldUpdateOperationsInput | string
    intervalSec?: IntFieldUpdateOperationsInput | number
    isSimulated?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumDeviceStatusFieldUpdateOperationsInput | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFieldUpdateOperationsInput | $Enums.ConnectionState
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cameraLatest?: CameraLatestUpdateOneWithoutDeviceNestedInput
  }

  export type DeviceUncheckedUpdateWithoutReadingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    roomId?: StringFieldUpdateOperationsInput | string
    type?: EnumDeviceTypeFieldUpdateOperationsInput | $Enums.DeviceType
    name?: StringFieldUpdateOperationsInput | string
    apiKeyHash?: StringFieldUpdateOperationsInput | string
    intervalSec?: IntFieldUpdateOperationsInput | number
    isSimulated?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumDeviceStatusFieldUpdateOperationsInput | $Enums.DeviceStatus
    connectionState?: EnumConnectionStateFieldUpdateOperationsInput | $Enums.ConnectionState
    lastSeen?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cameraLatest?: CameraLatestUncheckedUpdateOneWithoutDeviceNestedInput
  }

  export type SensorReadingCreateManyDeviceInput = {
    id?: bigint | number
    roomId: string
    temperature: number
    humidity: number
    recordedAt?: Date | string
  }

  export type SensorReadingUpdateWithoutDeviceInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    roomId?: StringFieldUpdateOperationsInput | string
    temperature?: FloatFieldUpdateOperationsInput | number
    humidity?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SensorReadingUncheckedUpdateWithoutDeviceInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    roomId?: StringFieldUpdateOperationsInput | string
    temperature?: FloatFieldUpdateOperationsInput | number
    humidity?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SensorReadingUncheckedUpdateManyWithoutDeviceInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    roomId?: StringFieldUpdateOperationsInput | string
    temperature?: FloatFieldUpdateOperationsInput | number
    humidity?: FloatFieldUpdateOperationsInput | number
    recordedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}