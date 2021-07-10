import { expect } from "chai";
import snoopy from "../src";
describe("snoopy", () => {
	const other = { world: "hello" };

	type TargetReturn<TRet, TArgs> = { r: TRet; a: TArgs; t: unknown };
	type Target<TRet, TArgs extends any[]> = {
		fn(...args: TArgs): TargetReturn<TRet, TArgs>;
	};
	function target<TArgs extends any[] = []>(): Target<void, TArgs>;
	function target<TRet, TArgs extends any[] = [string]>(ret: TRet): Target<TRet, TArgs>;
	function target<TRet, TArgs extends any[] = [string]>(ret?: TRet) {
		return (function () {
			return {
				fn: function (...args: TArgs) {
					return { r: ret, a: args, t: this };
				},
			};
		})();
	}

	describe("function", () => {
		describe("before", () => {
			it("can pass on to original function", function (this: any) {
				const t = target<[string]>();
				t.fn.call("xx");
				let called = 0;
				snoopy.function(t, "fn", {
					before(ctx) {
						called++;
						return ctx.next();
					},
				});
				const log = [t.fn("x"), t.fn("y"), t.fn("z")];
				const args = log.map((r) => r.a);
				expect(called).to.eq(3);
				expect(args).to.deep.eq([["x"], ["y"], ["z"]]);
			});
			it("can return before calling original function", () => {
				const t = target(123);
				expect(t.fn("").r).to.eq(123);
				snoopy.function(t, "fn", {
					before(ctx) {
						return ctx.return({
							a: ctx.arguments,
							r: 999,
							t: ctx.this,
						});
					},
				});
				expect(t.fn("").r).to.eq(999);
			});
			it("receives arguments", () => {
				const t = target<number, [number, number, number]>(1);

				let args: any = undefined;
				snoopy.function(t, "fn", {
					before(ctx) {
						args = ctx.arguments;
						return ctx.next();
					},
				});

				t.fn(1, 2, 3);
				expect(args).to.deep.eq([1, 2, 3]);
			});
			it("receives 'this' context", () => {
				const t = target();
				let self: any = undefined;
				snoopy.function(t, "fn", {
					before(ctx) {
						self = ctx.this;
						return ctx.next();
					},
				});
				t.fn();
				expect(self).to.eq(t);
			});
			it("can replace individual arguments", () => {
				const t = target<[string, number, boolean]>();
				snoopy.function(t, "fn", {
					before(ctx) {
						ctx.arguments[0] = "zzz";
						ctx.arguments[2] = false;
						return ctx.next();
					},
				});
				expect(t.fn("aaa", 1, true).a).to.deep.eq(["zzz", 1, false]);
			});
			it("can replace all arguments", () => {
				const t = target<[string, number, boolean]>();
				snoopy.function(t, "fn", {
					before(ctx) {
						ctx.arguments = ["zzz", 999, false];
						return ctx.next();
					},
				});
				expect(t.fn("aaa", 1, true).a).to.deep.eq(["zzz", 999, false]);
			});
			it("can replace 'this' context", () => {
				const t = target<[string, number, boolean]>();
				snoopy.function(t, "fn", {
					before(ctx) {
						ctx.this = other;
						return ctx.next();
					},
				});
				expect(t.fn("aaa", 1, true).t).to.eq(other);
			});
			it("can throw exception", () => {
				const t = target();
				snoopy.function(t, "fn", {
					before() {
						throw new Error("catch me");
					},
				});
				try {
					t.fn();
					expect.fail("did not error");
				} catch (error) {
					if (!error.toString().includes("catch me")) {
						throw error;
					}
				}
			});
			it("can run async code when original return is a promise", async () => {
				let retVal = 123;
				const t = {
					async fn(...args: any) {
						return { r: retVal, a: args, t: this };
					},
				};

				snoopy.function(t, "fn", {
					before(ctx) {
						return new Promise(async (r) => {
							await new Promise((v) => setTimeout(v, 100));
							retVal = 999;
							r(ctx.next());
						});
					},
				});

				expect((await t.fn()).r).to.eq(999);
			});
		});

		describe("after", () => {
			it("receives used & original arguments", () => {
				type args = [string, number, boolean];
				const t = target<args>();
				let origArgs: args | undefined = undefined;
				let args: args | undefined = undefined;
				snoopy.function(t, "fn", {
					before(ctx) {
						ctx.arguments = ["zzz", 999, false];
						return ctx.next();
					},
					after(ctx) {
						origArgs = ctx.original.arguments;
						args = ctx.arguments;
						return ctx.next();
					},
				});
				t.fn("aaa", 111, true);
				expect(origArgs).to.deep.eq(["aaa", 111, true]);
				expect(args).to.deep.eq(["zzz", 999, false]);
			});
			it("receives used & original 'this' context", () => {
				const t = target<[string, number, boolean]>();
				let origThis: unknown | undefined = undefined;
				let theThis: unknown | undefined = undefined;
				snoopy.function(t, "fn", {
					before(ctx) {
						ctx.this = other;
						return ctx.next();
					},
					after(ctx) {
						origThis = ctx.original.this;
						theThis = ctx.this;
						return ctx.next();
					},
				});
				expect(t.fn("aaa", 111, true).t).to.eq(other);
				expect(origThis).to.eq(t);
				expect(theThis).to.eq(other);
			});
			it("receives & can change return value", () => {
				const t = target("a");
				let origRet: TargetReturn<string, [string]> | undefined = undefined;
				snoopy.function(t, "fn", {
					after(ctx) {
						origRet = ctx.returnValue;
						return ctx.return({
							a: ["xxx"],
							r: "x",
							t: other,
						});
					},
				});

				expect(t.fn("aaa")).to.deep.eq({
					a: ["xxx"],
					r: "x",
					t: other,
				} as TargetReturn<string, [string]>);

				expect(origRet).to.deep.eq({
					a: ["aaa"],
					r: "a",
					t,
				} as TargetReturn<string, [string]>);
			});
			it("can run async code when original return is a promise", async () => {
				let retVal = 123;
				const t = {
					async fn(...args: any) {
						return { r: retVal, a: args, t: this };
					},
				};

				snoopy.function(t, "fn", {
					after(ctx) {
						return new Promise(async (r) => {
							await new Promise((v) => setTimeout(v, 100));
							(await ctx.returnValue).r = 999;
							r(ctx.next());
						});
					},
				});

				expect((await t.fn()).r).to.eq(999);
			});
			it("can throw exception", () => {
				const t = target();
				snoopy.function(t, "fn", {
					after() {
						throw new Error("catch me");
					},
				});
				try {
					t.fn();
					expect.fail("did not error");
				} catch (error) {
					if (!error.toString().includes("catch me")) {
						throw error;
					}
				}
			});
		});
	});
});
