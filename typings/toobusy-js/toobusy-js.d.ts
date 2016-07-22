declare module "toobusy-js" {
    module toobusy {
        function maxLag(newLag: number): number;
        function interval(newInterval: number): number;

        function lag(): number;

        function onLag(callback: (currentLag: number) => void, threshold?: number);
    }

    function toobusy(): boolean;
    export = toobusy;
}