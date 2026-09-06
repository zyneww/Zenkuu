// `RefObject` VIENT DE REACT, et non plus de `@react-types/shared`.
//
// Ce paquet n'a JAMAIS été déclaré dans `apps/web/package.json` : il ne vivait que
// dans le `node_modules` historique du dépôt principal, où une installation l'avait
// laissé sans l'inscrire. Un clone neuf — ou un arbre de travail réinstallé — échouait
// donc au typecheck sur cette seule ligne, avec un TS2307 qui n'accusait aucun code.
//
// React 19 publie le même type, et l'usage ici n'en demande rien de plus : le crochet
// se contente de LIRE `ref.current`. Déclarer la dépendance aurait aussi refermé le
// défaut ; ne plus en avoir besoin le referme mieux.
import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Checks if the ResizeObserver API is supported.
 * @returns True if the ResizeObserver API is supported, false otherwise.
 */
function hasResizeObserver() {
    return typeof window.ResizeObserver !== "undefined";
}

/**
 * The options for the useResizeObserver hook.
 */
type useResizeObserverOptionsType<T> = {
    /**
     * The ref to the element to observe.
     */
    ref: RefObject<T | undefined | null> | undefined;
    /**
     * The box to observe.
     */
    box?: ResizeObserverBoxOptions;
    /**
     * The callback function to call when the size changes.
     */
    onResize: () => void;
};

/**
 * A hook that observes the size of an element and calls a callback function when the size changes.
 * @param options - The options for the hook.
 */
export function useResizeObserver<T extends Element>(options: useResizeObserverOptionsType<T>) {
    const { ref, box, onResize } = options;

    useEffect(() => {
        const element = ref?.current;
        if (!element) {
            return;
        }

        if (!hasResizeObserver()) {
            window.addEventListener("resize", onResize, false);

            return () => {
                window.removeEventListener("resize", onResize, false);
            };
        } else {
            const resizeObserverInstance = new window.ResizeObserver((entries) => {
                if (!entries.length) {
                    return;
                }

                onResize();
            });

            resizeObserverInstance.observe(element, { box });

            return () => {
                if (element) {
                    resizeObserverInstance.unobserve(element);
                }
            };
        }
    }, [onResize, ref, box]);
}
