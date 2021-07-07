type KeysOfType<TObj, TKeyType> = { [k in keyof TObj]: TObj[k] extends TKeyType ? k : never }[keyof TObj];
type AnyFunction = (...args: any) => any;

interface PatchCallbacks {
	before?: Function;
	after?: Function;
}

class Snoopy {
	// patch a function, before/after
	public function<T, K extends KeysOfType<T, AnyFunction>>(target: T, fnKey: K, callbacks: PatchCallbacks): void {}

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
