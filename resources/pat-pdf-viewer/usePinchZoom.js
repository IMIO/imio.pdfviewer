import { useEffect, useRef } from "react";

// Two taps in this time (ms) make a double tap.
const DOUBLE_TAP_DELAY = 300;
// A touch that moves more than this distance (px) is not a tap.
const TAP_DISTANCE = 10;

const spread = (touches) =>
    Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
    );

// Pinch and double tap on a touch screen. The web page does not zoom.
// onPinch(ratio) runs while two fingers move, onPinchEnd(ratio) when they
// leave, and onDoubleTap() after a double tap.
export const usePinchZoom = (ref, handlers) => {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        const el = ref.current;
        if (!el) {
            return undefined;
        }
        let startSpread = null;
        let ratio = 1;
        let tapStart = null;
        let lastTap = -Infinity;

        const onTouchStart = (event) => {
            if (event.touches.length === 2) {
                event.preventDefault();
                startSpread = spread(event.touches);
                ratio = 1;
                tapStart = null;
            } else if (event.touches.length === 1) {
                const { clientX, clientY } = event.touches[0];
                tapStart = { clientX, clientY };
            }
        };

        const onTouchMove = (event) => {
            if (startSpread === null || event.touches.length !== 2) {
                return;
            }
            event.preventDefault();
            ratio = spread(event.touches) / startSpread;
            handlersRef.current.onPinch(ratio);
        };

        const onTouchEnd = (event) => {
            if (startSpread !== null) {
                if (event.touches.length < 2) {
                    startSpread = null;
                    handlersRef.current.onPinchEnd(ratio);
                }
                return;
            }
            const touch = event.changedTouches[0];
            const isTap =
                tapStart &&
                touch &&
                event.touches.length === 0 &&
                Math.hypot(
                    touch.clientX - tapStart.clientX,
                    touch.clientY - tapStart.clientY,
                ) < TAP_DISTANCE;
            tapStart = null;
            if (!isTap) {
                return;
            }
            if (event.timeStamp - lastTap < DOUBLE_TAP_DELAY) {
                event.preventDefault();
                lastTap = -Infinity;
                handlersRef.current.onDoubleTap();
            } else {
                lastTap = event.timeStamp;
            }
        };

        const options = { passive: false };
        el.addEventListener("touchstart", onTouchStart, options);
        el.addEventListener("touchmove", onTouchMove, options);
        el.addEventListener("touchend", onTouchEnd, options);
        el.addEventListener("touchcancel", onTouchEnd, options);
        return () => {
            el.removeEventListener("touchstart", onTouchStart, options);
            el.removeEventListener("touchmove", onTouchMove, options);
            el.removeEventListener("touchend", onTouchEnd, options);
            el.removeEventListener("touchcancel", onTouchEnd, options);
        };
    }, [ref]);
};
