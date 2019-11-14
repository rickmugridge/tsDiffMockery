import {MockedCall, SuccessfulCall} from "./MockedCall";
import {isSymbol} from "util";
import {Thespian} from "./Thespian";
import {PrettyPrinter} from "mismatched";

export class MockHandler implements ProxyHandler<{}> {
    mapMethodToMockCalls = new Map<PropertyKey, Array<MockedCall<any>>>();

    constructor(private mockName: string, private successfulCalls: Array<SuccessfulCall>) {
    }

    add(mockCall: MockedCall<any>) {
        const mockCalls = this.mapMethodToMockCalls.get(mockCall.methodName);
        if (!mockCalls) {
            this.mapMethodToMockCalls.set(mockCall.methodName, [mockCall]);
        } else {
            mockCalls.push(mockCall);
        }
    }

    get(target, propKey: string | number | symbol, receiver): any { // actually a "(...) => any" for methods and functions
        const self = this;
        if (propKey === Thespian.symbolForMockToString) {
            return () => self.mockName;
        }
        if (isSymbol(propKey) || propKey === "inspect" || propKey === "name") {
            return undefined;
        }
        const mockCalls = this.mapMethodToMockCalls.get(propKey);

        function returnedFn() {// Seems to have to be a function for it to work
            const actualArguments = Array.from(arguments);
            for (let call of mockCalls!) {
                const did = call.matchToRunResult(actualArguments); // todo keep the best match in case succeed
                if (did.isSome) {
                    return did.some;
                }
            }
            self.error({
                problem: "Unable to handle call to mock, as none match",
                mockCall: {
                    [PrettyPrinter.symbolForPseudoCall]: `${self.mockName}.${propKey.toString()}`,
                    args: actualArguments
                },
                previousSuccessfulCalls: self.successfulCalls.map(s => s.describe())
            });
        }

        if (mockCalls) {
            return returnedFn;
        }
        this.error({
            problem: "Unable to handle call, as no mocks",
            mockCall: {[PrettyPrinter.symbolForPseudoCall]: `${self.mockName}.${propKey.toString()}`},
            previousSuccessfulCalls: this.successfulCalls.map(s => s.describe())
        });
    }


    // Called by apply() and call().
    apply(target, thisArg, actualArguments: Array<any>) {
        const mockCalls = this.mapMethodToMockCalls.get(MockHandler.applyKey);
        if (mockCalls) {
            for (let call of mockCalls) {
                const did = call.matchToRunResult(actualArguments); // todo keep the best match in case we fail and show diff for that if reasonable
                if (did.isSome) {
                    return did.some;
                }
            }
        }
        this.error({
            problem: "Unable to handle call to mock, as none match",
            mockCall: {
                [PrettyPrinter.symbolForPseudoCall]: this.mockName,
                args: actualArguments
            },
            previousSuccessfulCalls: this.successfulCalls.map(s => s.describe())
        });
    }

    error(msg: object) {
        throw new Error(Thespian.printer.render(msg));
    }

    has(target, propKey: string): boolean {
        const mockCalls = this.mapMethodToMockCalls.get(propKey);
        return !!mockCalls;
    }

    set(target, propKey: string, value: any): boolean {
        throw new Error(`Not yet implemented: Unable to set ${propKey} to ${value}`)
    }

    deleteProperty(target, propKey: string): boolean {
        throw new Error(`Not yet implemented: Unable to delete property ${propKey}`)
    }

    getOwnPropertyDescriptor(target, prop: string | number | symbol): PropertyDescriptor | undefined {
        try {// todo check results here
            return {configurable: true, enumerable: true, value: this.get(target, prop, undefined)};
        } catch (e) {
            return undefined;
        }
    }

    verify(errors: Array<any>) {
        this.mapMethodToMockCalls.forEach(mockCalls =>
            mockCalls.filter(m => !m.hasPassed()).forEach(m => errors.push(m.describe()))
        );
    }

    describeMocks(): Array<any> {
        const result: Array<any> = [];
        this.mapMethodToMockCalls.forEach(mockCalls =>
            mockCalls.filter(m => m.hasRun()).forEach(m => result.push(m.describe()))
        );
        return result;
    }

    static applyKey = "";
}