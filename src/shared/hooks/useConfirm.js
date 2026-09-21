import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export default function useConfirm() {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((next = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setOpts(next);
    });
  }, []);

  const settle = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = (
    <ConfirmDialog
      open={Boolean(opts)}
      title={opts?.title || 'Are you sure?'}
      message={opts?.message}
      confirmLabel={opts?.confirmLabel}
      cancelLabel={opts?.cancelLabel}
      danger={opts?.danger !== false}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  );

  return [confirm, dialog];
}
