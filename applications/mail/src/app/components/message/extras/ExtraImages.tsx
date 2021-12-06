import { shiftKey } from '@proton/shared/lib/helpers/browser';
import { Icon, useMailSettings, Tooltip } from '@proton/components';
import { c } from 'ttag';
import { hasShowEmbedded, hasShowRemote } from '../../../helpers/mailSettings';
import { MessageState } from '../../../logic/messages/messagesTypes';
import { hasToSkipProxy } from '../../../helpers/message/messageRemotes';

interface Props {
    message: MessageState;
    type: string;
    onLoadImages: () => void;
}

const ExtraImages = ({ message, type, onLoadImages }: Props) => {
    const [mailSettings] = useMailSettings();
    const [{ Shortcuts = 0 } = {}] = useMailSettings();

    const { showRemoteImages = true, showEmbeddedImages = true } = message.messageImages || {};

    const couldLoadDirect =
        type === 'remote' && showRemoteImages === true && hasToSkipProxy(message.messageImages?.images);

    if (type === 'embedded' && hasShowEmbedded(mailSettings)) {
        return null;
    }

    if (type === 'embedded' && showEmbeddedImages !== false) {
        return null;
    }

    if (type === 'remote' && hasShowRemote(mailSettings)) {
        return null;
    }

    if (type === 'remote' && showRemoteImages !== false && !couldLoadDirect) {
        return null;
    }

    const remoteText = couldLoadDirect
        ? c('Title').t`Some images could not be loaded with tracking protection [Load unprotected]`
        : c('Title').t`Load remote content`;

    const embeddedText = c('Action').t`This message contains embedded images.`;

    const text = type === 'remote' ? remoteText : embeddedText;

    const tooltip = Shortcuts ? (
        <>
            {text}
            <br />
            <kbd className="no-border">{shiftKey}</kbd> + <kbd className="no-border">C</kbd>
        </>
    ) : undefined;

    return (
        <div className="bg-norm rounded bordered p0-5 mb0-5 flex flex-nowrap">
            <Icon name="image" className="mtauto mbauto" />
            <span className="pl0-5 pr0-5 flex-item-fluid">{text}</span>
            <Tooltip title={tooltip}>
                <button
                    type="button"
                    onClick={onLoadImages}
                    className="flex flex-item-noshrink text-underline link"
                    data-testid="remote-content:load1"
                >{c('Action').t`Load`}</button>
            </Tooltip>
        </div>
    );
};

export default ExtraImages;
