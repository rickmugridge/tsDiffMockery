import {Thespian} from "./Thespian";
import {assertThat, match, PrettyPrinter} from "mismatched";

describe("Thespian()", () => {
    describe("object", () => {
        it("method called once", () => {
            const thespian = new Thespian();
            const mock = thespian.mock<I>("an object");
            mock
                .setup(f => f.foo(2, match.ofType.string()))
                .returns(() => 44);
            assertThat(mock.object.foo(2, "aaa")).is(44);
            thespian.verify();
        });

        it("a method called twice with same arguments and same result", () => {
            const thespian = new Thespian();
            const mock = thespian.mock<I>("an object");
            mock
                .setup(f => f.foo(2, "aaa"))
                .returns(() => 44)
                .times(2);
            assertThat(mock.object.foo(2, "aaa")).is(44);
            assertThat(mock.object.foo(2, "aaa")).is(44);
            thespian.verify();
        });

        it("a method called twice with same arguments", () => {
            const thespian = new Thespian();
            const mock = thespian.mock<I>("an object");
            mock
                .setup(f => f.foo(2, "aaa"))
                .returns(() => 44);
            mock
                .setup(f => f.foo(2, "aaa"))
                .returns(() => 55);
            assertThat(mock.object.foo(2, "aaa")).is(44);
            assertThat(mock.object.foo(2, "aaa")).is(55);
            thespian.verify();
        });

        it("a method called twice with different arguments", () => {
            const thespian = new Thespian();
            const mock = thespian.mock<I>("an object");
            mock
                .setup(f => f.foo(2, "aaa"))
                .returns(() => 44);
            mock
                .setup(f => f.foo(3, "aaa"))
                .returns(() => 55);
            assertThat(mock.object.foo(3, "aaa")).is(55);
            assertThat(mock.object.foo(2, "aaa")).is(44);
            thespian.verify();
        });
    });

    describe("function", () => {
        it("function called once", () => {
            let thespian = new Thespian();
            let mock = thespian.mock<(i: number) => number>("fn");
            mock
                .setup(g => g(2))
                .returns(() => 33);
            assertThat(mock.object(2)).is(33);
            thespian.verify();
        });

        it("function called twice with same arguments and same result", () => {
            const thespian = new Thespian();
            const mock = thespian.mock<(i: number) => number>("fn");
            mock
                .setup(g => g(2))
                .returns(() => 33)
                .times(2);
            assertThat(mock.object(2)).is(33);
            assertThat(mock.object(2)).is(33);
            thespian.verify();
        });

        it("function called twice with same arguments and different result", () => {
            const thespian = new Thespian();
            const mock = thespian.mock<(i: number) => number>("fn");
            mock
                .setup(g => g(2))
                .returns(() => 33);
            mock
                .setup(g => g(2))
                .returns(() => 44);
            assertThat(mock.object(2)).is(33);
            assertThat(mock.object(2)).is(44);
            thespian.verify();
        });

        it("function called twice with different arguments", () => {
            const thespian = new Thespian();
            const mock = thespian.mock<(i: number) => number>("fn");
            mock
                .setup(g => g(2))
                .returns(() => 33);
            mock
                .setup(g => g(3))
                .returns(() => 44);
            assertThat(mock.object(3)).is(44);
            assertThat(mock.object(2)).is(33);
            thespian.verify();
        });
    });

    it("Mocks are displayed correctly when in mismatched argument list", () => {
        PrettyPrinter.make(80, 10, Thespian.symbolForMockToString);
        const thespian = new Thespian();
        const mockI = thespian.mock<I>("i");
        mockI
            .setup(g => g.foo(2, "a"))
            .returns(() => 33);
        const i = mockI.object;
        const mockJ = thespian.mock<J>("j");
        const j = mockJ.object;
        mockJ
            .setup(g => g.ga(j))
            .returns(arg => arg);
        assertThat(() => j.ga(i)).throws(new Error(`{
  problem: "Unable to handle call to mock, as none match", 
  mockCall: j.ga({mock: "i"}), previousSuccessfulCalls: []
}`))
    });
});

interface I {
    foo(i: number, b: string): number
}

interface J {
    ga(i: I): I
}
