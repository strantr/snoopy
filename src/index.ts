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
type BeforeCallback<TFunction extends AnyFunction> = (context: BeforeCallbackContext<TFunction>) => typeof snoopycall;
type AfterCallback<TFunction extends AnyFunction> = (context: AfterCallbackContext<TFunction>) => typeof snoopycall;

interface PatchConfig<T extends AnyFunction> {
	before?: BeforeCallback<T>;
	after?: AfterCallback<T>;
}

class Snoopy {
	// patch a function, before/after
	public function<T, K extends KeysOfType<T, AnyFunction>>(target: T, fnKey: K, callbacks: PatchConfig<T[K]>): void {}

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
