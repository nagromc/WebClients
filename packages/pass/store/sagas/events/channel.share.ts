/* eslint-disable @typescript-eslint/no-throw-literal, curly */
import type { AnyAction } from 'redux';
import { all, call, fork, put, select, take } from 'redux-saga/effects';

import { ACTIVE_POLLING_TIMEOUT } from '@proton/pass/lib/events/constants';
import type { EventManagerEvent } from '@proton/pass/lib/events/manager';
import { parseItemRevision } from '@proton/pass/lib/items/item.parser';
import { parseShareResponse } from '@proton/pass/lib/shares/share.parser';
import { getShareLatestEventId } from '@proton/pass/lib/shares/share.requests';
import {
    itemDeleteSync,
    itemEditSync,
    itemUsedSync,
    shareDeleteSync,
    shareEditSync,
    shareEvent,
    vaultDeleteSuccess,
} from '@proton/pass/store/actions';
import type { ShareItem } from '@proton/pass/store/reducers/shares';
import { selectAllShares, selectShare } from '@proton/pass/store/selectors';
import type { RootSagaOptions } from '@proton/pass/store/types';
import type { Api, ItemRevision, Maybe, PassEventListResponse, Share } from '@proton/pass/types';
import { ShareType } from '@proton/pass/types';
import { logId, logger } from '@proton/pass/utils/logger';
import { getApiError } from '@proton/shared/lib/api/helpers/apiErrorHelper';

import { discardDrafts } from '../items/item-drafts';
import { eventChannelFactory } from './channel.factory';
import { channelEventsWorker, channelWakeupWorker } from './channel.worker';
import type { EventChannel } from './types';

export type ShareEventResponse = { Events: PassEventListResponse };

/* It is important to call onItemsDeleted before
 * actually dispatching the resulting action : we may be dealing
 * with a share or an item being selected in the pop-up and need
 * to run the side-effect before clearing the data from the store
 * FIXME: support ItemShares */
const onShareEvent = (shareId: string) =>
    function* (
        event: EventManagerEvent<ShareEventResponse>,
        _: EventChannel<ShareEventResponse>,
        { onItemsUpdated, onItemsDeleted }: RootSagaOptions
    ) {
        if ('error' in event) throw event.error;

        const { Events } = event;
        const { LatestEventID: eventId, DeletedItemIDs, UpdatedItems, UpdatedShare, LastUseItems } = Events;
        const currentEventId = ((yield select(selectShare(shareId))) as Maybe<ShareItem>)?.eventId;

        logger.debug(`[ServerEvents::Share::${logId(shareId)}] event ${logId(eventId)}`);

        /* dispatch only if there was a change */
        if (currentEventId !== eventId) yield put(shareEvent({ ...event, shareId }));

        if (UpdatedShare && UpdatedShare.TargetType === ShareType.Vault) {
            const share: Maybe<Share<ShareType.Vault>> = yield parseShareResponse(UpdatedShare, { eventId });
            if (share) yield put(shareEditSync({ id: share.shareId, share }));
        }

        if (DeletedItemIDs.length > 0) {
            yield discardDrafts(shareId, DeletedItemIDs);
            onItemsDeleted?.(shareId, DeletedItemIDs);
        }

        yield all([
            ...DeletedItemIDs.map((itemId) => put(itemDeleteSync({ itemId, shareId }))),
            ...UpdatedItems.map((encryptedItem) =>
                call(function* () {
                    try {
                        const item: ItemRevision = yield parseItemRevision(shareId, encryptedItem);
                        yield put(itemEditSync({ shareId: item.shareId, itemId: item.itemId, item }));
                    } catch (_) {}
                })
            ),
            ...(LastUseItems ?? []).map(({ ItemID, LastUseTime }) =>
                put(itemUsedSync({ shareId, itemId: ItemID, lastUseTime: LastUseTime }))
            ),
        ]);

        const itemsMutated = DeletedItemIDs.length > 0 || UpdatedItems.length > 0;
        if (itemsMutated) onItemsUpdated?.();
    };

const onShareEventError = (shareId: string) =>
    function* (
        error: unknown,
        { channel }: EventChannel<ShareEventResponse>,
        { onShareDeleted, onItemsUpdated }: RootSagaOptions
    ) {
        const { code } = getApiError(error);

        /* share was deleted or user lost access */
        if (code === 300004) {
            logger.info(`[ServerEvents::Share::${logId(shareId)}] share disabled`);
            channel.close();

            const share: Maybe<Share> = yield select(selectShare(shareId));
            if (share) {
                onShareDeleted?.(shareId);
                onItemsUpdated?.();
                yield discardDrafts(shareId);
                yield put(shareDeleteSync(share));
            }
        }
    };

const onShareDeleted = (shareId: string) =>
    function* ({ channel }: EventChannel<ShareEventResponse>): Generator {
        yield take((action: AnyAction) => vaultDeleteSuccess.match(action) && action.payload.shareId === shareId);
        logger.info(`[ServerEvents::Share::${logId(shareId)}] share deleted`);
        channel.close();
        yield discardDrafts(shareId);
    };

/* We need to lift the response to the correct data
 * structure by leveraging ApiOptions::mapResponse
 * (see type definition and create-api.ts for specs) */
export const createShareChannel = (api: Api, { shareId, eventId }: Share) =>
    eventChannelFactory<ShareEventResponse>({
        api,
        interval: ACTIVE_POLLING_TIMEOUT,
        initialEventID: eventId,
        query: (eventId) => ({ url: `pass/v1/share/${shareId}/event/${eventId}`, method: 'get' }),
        getCursor: ({ Events }) => ({ EventID: Events.LatestEventID, More: Events.EventsPending }),
        getLatestEventID: () => getShareLatestEventId(shareId),
        onClose: () => logger.info(`[ServerEvents::Share::${logId(shareId)}] closing channel`),
        onEvent: onShareEvent(shareId),
        onError: onShareEventError(shareId),
    });

export const getShareChannelForks = (api: Api, options: RootSagaOptions) => (share: Share) => {
    logger.info(`[ServerEvents::Share::${logId(share.shareId)}] start polling`);
    const eventsChannel = createShareChannel(api, share);
    const events = fork(channelEventsWorker<ShareEventResponse>, eventsChannel, options);
    const wakeup = fork(channelWakeupWorker<ShareEventResponse>, eventsChannel);
    const onDelete = fork(onShareDeleted(share.shareId), eventsChannel);

    return [events, wakeup, onDelete];
};

export function* shareChannels(api: Api, options: RootSagaOptions) {
    const shares = (yield select(selectAllShares)) as Share[];
    yield all(shares.map(getShareChannelForks(api, options)).flat());
}
