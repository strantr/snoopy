import { expect } from "chai";
import snoopy from "../src";

describe("snoopy", () => {
	type MyEventMap = {
		event1: Event;
		event2: MouseEvent;
		event3: FocusEvent;
	};
	const myEventObject1 = {
		_listeners: {} as Record<string, Function[]>,
		addEventListener<K extends keyof MyEventMap>(name: K, listener: (ev: MyEventMap[K]) => any) {
			if (!(name in myEventObject1._listeners)) {
				myEventObject1._listeners[name] = [listener];
			} else {
				myEventObject1._listeners[name].push(listener);
			}
		},
		raiseEvent<K extends keyof MyEventMap>(name: K, e: MyEventMap[K]) {
			for (const x of myEventObject1._listeners[name]) {
				x(e);
			}
		},
	};
	const myEventObject2 = {
		_listeners: {} as Record<string, EventListenerOrEventListenerObject[]>,
		addEventListener(name: string, listener: EventListenerOrEventListenerObject) {
			if (!(name in myEventObject2._listeners)) {
				myEventObject2._listeners[name] = [listener];
			} else {
				myEventObject2._listeners[name].push(listener);
			}
		},
		raiseEvent(name: string, e: Event) {
			for (const x of myEventObject2._listeners[name]) {
				if (typeof x === "function") {
					x(e);
				} else {
					x.handleEvent(e);
				}
			}
		},
	};
	const myEventObject3 = Object.assign({}, myEventObject1, myEventObject2);

	describe("event", () => {
		it("can intercept all events with a single listener", () => {});
		it("can intercept a single named event with a listener", () => {});
		it("can intercept multiple named events using unique listeners", () => {});
		it("can intercept multiple named events using a single listener", () => {});
		describe("before", () => {
			it("can return before calling the original listener", () => {});
		});
		describe("after", () => {
			it("can execute after the original listener is called", () => {});
		});
	});
});
