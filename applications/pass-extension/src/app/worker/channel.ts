import { clientReady } from '@proton/pass/lib/client';
import { createMessageBroker } from '@proton/pass/lib/extension/message';
import { cacheRequest } from '@proton/pass/store/actions';
import { SessionLockStatus, WorkerMessageType } from '@proton/pass/types';
import noop from '@proton/utils/noop';

import { withContext } from './context';
import store from './store';

/* For security reasons : limit the type of messages that
 * can be processed via externally connectable resources.
 * When we detect a popup port being disconnected : this
 * likely means the popup was closed : dispatch a cache request
 * in order to save the latest popup state */
const WorkerMessageBroker = createMessageBroker({
    allowExternal: [
        WorkerMessageType.ACCOUNT_FORK,
        WorkerMessageType.ACCOUNT_EXTENSION,
        WorkerMessageType.ACCOUNT_PROBE,
        WorkerMessageType.ACCOUNT_ONBOARDING,
    ],
    strictOriginCheck: [
        WorkerMessageType.AUTH_CHECK,
        WorkerMessageType.ALIAS_CREATE,
        WorkerMessageType.ALIAS_OPTIONS,
        WorkerMessageType.AUTOFILL_SELECT,
        WorkerMessageType.AUTOSAVE_REQUEST,
        WorkerMessageType.EXPORT_REQUEST,
        WorkerMessageType.IMPORT_PREPARE,
        WorkerMessageType.LOG_REQUEST,
        WorkerMessageType.ONBOARDING_ACK,
        WorkerMessageType.ONBOARDING_REQUEST,
        WorkerMessageType.OTP_CODE_GENERATE,
        WorkerMessageType.POPUP_INIT,
        WorkerMessageType.AUTH_UNLOCK,
    ],
    onError: withContext((ctx, err) => {
        if (err instanceof Error && err.name === 'VersionMismatch') void ctx.service.activation.reload();
    }),
    onDisconnect: withContext((ctx, portName) => {
        const isPopup = portName.startsWith('popup');
        const hasRegisteredLock = ctx.authStore.getLockStatus() === SessionLockStatus.REGISTERED;

        /** check if the client is ready before triggering this
         * cache request as we may be in an on-going boot */
        if (isPopup && clientReady(ctx.getState().status)) {
            store.dispatch(cacheRequest({ throttle: true }));
            if (hasRegisteredLock) ctx.service.auth.checkLock().catch(noop);
        }
    }),
});

export default WorkerMessageBroker;
