import { useMemo, useState } from 'react';

/** minimal controller surface required by the hook */
export interface ControllerLike {
  togglePlayPause: () => void;
  pause: () => void;
  play: () => void;
  getIsPlaying: () => boolean;
}

/**
 * React hook to synchronize a PlayPauseController or SyncPlotsController
 * with React state.
 *
 * @param ControllerClass - The controller class constructor (e.g., PlayPauseController)
 * @param controllerArgs - Arguments passed to the controller constructor
 * @returns [controllerInstance, isPlaying] tuple
 *
 * @example
 * const [controller, isPlaying] = useControllerWithState(SyncPlotsController, [[plot]]);
 */
export function useControllerWithState<
  T extends ControllerLike,
  A extends unknown[],
>(ControllerClass: new (...args: A) => T, controllerArgs: A): [T, boolean] {
  const [isPlaying, setIsPlaying] = useState(false);

  const controller = useMemo(() => {
    const ctrl = new ControllerClass(...controllerArgs);

    // wrap the controller methods to mirror the playing state into React
    const originalToggle = ctrl.togglePlayPause;
    ctrl.togglePlayPause = () => {
      originalToggle.call(ctrl);
      setIsPlaying(ctrl.getIsPlaying());
    };

    const originalPause = ctrl.pause;
    ctrl.pause = () => {
      originalPause.call(ctrl);
      setIsPlaying(false);
    };

    const originalPlay = ctrl.play;
    ctrl.play = () => {
      originalPlay.call(ctrl);
      setIsPlaying(true);
    };

    return ctrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, controllerArgs);

  return [controller, isPlaying];
}
