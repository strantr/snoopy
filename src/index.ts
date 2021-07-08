type KeysOfType<TObj, TKeyType> = { [k in keyof TObj]: TObj[k] extends TKeyType ? k : never }[keyof TObj];
type AnyFunction = (...args: any) => any;
const snoopycall = Symbol("🕵️‍♂️");

interface PatchCallbackContext<TFunction extends AnyFunction> {
	this: ThisParameterType<TFunction>;
	arguments: Parameters<TFunction>;
	return(value: ReturnType<TFunction>): typeof snoopycall;
	next(): typeof snoopycall;
}

interface BeforeCallbackContext<TFunction extends AnyFunction> extends PatchCallbackContext<TFunction> {}
interface AfterCallbackContext<TFunction extends AnyFunction> extends PatchCallbackContext<TFunction> {
	original: {
		this: ThisParameterType<TFunction>;
		arguments: Parameters<TFunction>;
	};
	returnValue: ReturnType<TFunction>;
}
type PromishCallback<TFunction extends AnyFunction> = ReturnType<TFunction> extends Promise<any>
	? Promise<typeof snoopycall>
	: typeof snoopycall;

type ConfigCallback<TFunction extends AnyFunction, TContext> = (context: TContext) => PromishCallback<TFunction>;
type BeforeCallback<TFunction extends AnyFunction> = ConfigCallback<TFunction, BeforeCallbackContext<TFunction>>;
type AfterCallback<TFunction extends AnyFunction> = ConfigCallback<TFunction, AfterCallbackContext<TFunction>>;

interface PatchConfig<T extends AnyFunction> {
	before?: BeforeCallback<T>;
	after?: AfterCallback<T>;
}

class Snoopy {
	#setProperty<T, K extends keyof T>(target: T, key: K, value: T[K]) {
		Object.defineProperty(target, key, {
			configurable: true,
			writable: false,
			value,
		});

		if (target[key] !== value) {
			throw new Error(`Unable to set property '${key}'.`);
		}
	}

	#handleBefore<TFunction extends AnyFunction>(
		that: ThisParameterType<TFunction>,
		args: Parameters<TFunction>,
		handler: BeforeCallback<TFunction>
	) {
		let returnValue: ReturnType<TFunction>;
		let returnSet = false;
		let currentArgs = args;
		let currentThis = that;
		const handled = handler({
			get arguments() {
				return currentArgs;
			},
			set arguments(value) {
				currentArgs = value;
			},
			get this() {
				return currentThis;
			},
			set this(value) {
				currentThis = value;
			},
			next() {
				return snoopycall;
			},
			return(value) {
				returnSet = true;
				returnValue = value;
				return snoopycall;
			},
		});
		const getResp = () => ({ currentArgs, currentThis, ...(returnSet ? { returnValue: returnValue! } : {}) });
		if (handled instanceof Promise) {
			return handled.then((p) => getResp());
		}
		return getResp();
	}

	#handleAfter<TFunction extends AnyFunction>(
		currentThis: ThisParameterType<TFunction>,
		currentArgs: Parameters<TFunction>,
		origThis: ThisParameterType<TFunction>,
		origArgs: Parameters<TFunction>,
		handler: AfterCallback<TFunction>,
		returnValue: ReturnType<TFunction>
	) {
		const handled = handler({
			arguments: currentArgs,
			this: currentThis,
			get returnValue() {
				return returnValue;
			},
			set returnValue(value) {
				returnValue = value;
			},
			original: {
				arguments: origArgs,
				this: origThis,
			},
			next() {
				return snoopycall;
			},
			return(value: ReturnType<TFunction>) {
				returnValue = value;
				return snoopycall;
			},
		});
		if (handled instanceof Promise) {
			return handled.then(() => returnValue);
		}
		return returnValue;
	}

	// patch a function, before/after
	public function<T, K extends KeysOfType<T, AnyFunction>>(target: T, fnKey: K, callbacks: PatchConfig<T[K]>): void {
		const self = this;
		const original: AnyFunction = target[fnKey];
		if (typeof original !== "function") {
			throw new Error(`Property '${fnKey}' on target must be of type 'function'. Actual type: '${typeof original}'.`);
		}

		const patch = function (this: unknown) {
			type fn = T[K];

			const origArgs = [...arguments] as Parameters<fn>;
			const origThis = this as ThisParameterType<fn>;
			let currentArgs = [...arguments] as Parameters<fn>;
			let currentThis = this as ThisParameterType<fn>;

			let after = () => {
				let returnValue: ReturnType<fn> = original.apply(currentThis, currentArgs);

				if (callbacks.after) {
					const h = self.#handleAfter(currentThis, currentArgs, origThis, origArgs, callbacks.after, returnValue);
					if (h instanceof Promise) {
						return h;
					} else {
						returnValue = h;
					}
				}
				return returnValue;
			};

			let next = (h: {
				returnValue?: NonNullable<ReturnType<T[K]>> | undefined;
				currentArgs: Parameters<T[K]>;
				currentThis: ThisParameterType<T[K]>;
			}) => {
				if ("returnValue" in h) {
					return h.returnValue!;
				}
				({ currentThis, currentArgs } = h);
				return after();
			};

			if (callbacks.before) {
				const handle = self.#handleBefore(currentThis, currentArgs, callbacks.before);
				if (handle instanceof Promise) {
					return handle.then(next);
				} else {
					return next(handle);
				}
			}
			return after();
		};

		this.#setProperty(target, fnKey, patch as T[K]);
	}

	// public event<T extends EventEmittingObject>(
	// 	target: EventEmittingObject,
	// 	name: Parameters<EventEmittingObject["addEventListener"]>[0]
	// ) {}

	// patch a property, get/set before/after
	// public prop<T, K extends keyof T>(
	// 	target: T,
	// 	propKey: K,
	// 	callbacks: {
	// 		get?: PatchCallbacks;
	// 		set?: PatchCallbacks;
	// 	}
	// ): void {}
}
export default new Snoopy();

// new Snoopy().event(window, "xxxxx");

// declare const c: {
// 	addEventListener<K extends keyof WindowEventMap>(
// 		type: K,
// 		listener: (this: Window, ev: WindowEventMap[K]) => any,
// 		options?: boolean | AddEventListenerOptions
// 	): void;
// 	addEventListener(
// 		type: string,
// 		listener: EventListenerOrEventListenerObject,
// 		options?: boolean | AddEventListenerOptions
// 	): void;
// };

// type x = Parameters<typeof c["addEventListener"]>;

// type p = { [k in keyof typeof c]: typeof c[k] extends Function ? 1 : 0 };

// type EventEmittingObject = {
// 	addEventListener<K extends string>(
// 		type: K,
// 		listener: EventListenerOrEventListenerObject,
// 		options?: boolean | AddEventListenerOptions
// 	): void;
// };
