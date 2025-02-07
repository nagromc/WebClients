import { fireEvent, getByTestId as getByTestIdDefault, waitFor } from '@testing-library/react';
import { addHours } from 'date-fns';
import loudRejection from 'loud-rejection';

import { MIME_TYPES } from '@proton/shared/lib/constants';

import { releaseCryptoProxy, setupCryptoProxyForTesting } from '../../../helpers/test/crypto';
import {
    addApiKeys,
    addApiMock,
    addKeysToAddressKeysCache,
    clearAll,
    generateKeys,
    getDropdown,
    render,
    setFeatureFlags,
    tick,
    waitForNotification
} from '../../../helpers/test/helper';
import { store } from '../../../logic/store';
import Composer from '../Composer';
import { AddressID, ID, fromAddress, prepareMessage, props, saveNow, toAddress } from './Composer.test.helpers';

loudRejection();

const password = 'password';

describe('Composer outside encryption', () => {
    beforeEach(() => {
        clearAll();
    });
    beforeAll(async () => {
        await setupCryptoProxyForTesting();
    });
    afterAll(async () => {
        clearAll();
        await releaseCryptoProxy();
    });

    const setup = async () => {
        setFeatureFlags('EORedesign', true);

        addApiMock(`mail/v4/messages/${ID}`, () => ({ Message: {} }), 'put');

        const fromKeys = await generateKeys('me', fromAddress);
        addKeysToAddressKeysCache(AddressID, fromKeys);
        addApiKeys(false, toAddress, []);

        const composerID = Object.keys(store.getState().composers.composers)[0];

        const result = await render(<Composer {...props} composerID={composerID} />);

        return result;
    };

    it('should set outside encryption and display the expiration banner', async () => {
        prepareMessage({
            localID: ID,
            data: { MIMEType: 'text/plain' as MIME_TYPES },
            messageDocument: { plainText: '' },
        });

        const { getByTestId, getByText, container } = await setup();

        const expirationButton = getByTestId('composer:password-button');
        fireEvent.click(expirationButton);
        await tick();

        // modal is displayed and we can set a password
        getByText('Encrypt message');

        const passwordInput = getByTestId('encryption-modal:password-input');
        fireEvent.change(passwordInput, { target: { value: password } });

        const setEncryptionButton = getByTestId('modal-footer:set-button');
        fireEvent.click(setEncryptionButton);

        await waitForNotification('Password has been set successfully');

        // The expiration banner is displayed
        getByText(/This message will expire/);

        await saveNow(container);
    });

    it('should set outside encryption with a default expiration time', async () => {
        // Message will expire tomorrow
        prepareMessage({
            localID: ID,
            data: { MIMEType: 'text/plain' as MIME_TYPES },
            messageDocument: { plainText: '' },
            draftFlags: {
                expiresIn: addHours(new Date(), 25), // expires in 25 hours
            },
        });

        const { getByTestId, getByText } = await setup();

        const expirationButton = getByTestId('composer:password-button');
        fireEvent.click(expirationButton);

        // Modal and expiration date are displayed
        getByText('Edit encryption');
        getByText('Your message will expire tomorrow.');
    });

    it('should be able to edit encryption', async () => {
        prepareMessage({
            localID: ID,
            data: { MIMEType: 'text/plain' as MIME_TYPES },
            messageDocument: { plainText: '' },
        });

        const { getByTestId, getByText, container } = await setup();

        const expirationButton = getByTestId('composer:password-button');
        fireEvent.click(expirationButton);

        // modal is displayed and we can set a password
        getByText('Encrypt message');

        const passwordInput = getByTestId('encryption-modal:password-input');
        fireEvent.change(passwordInput, { target: { value: password } });

        const setEncryptionButton = getByTestId('modal-footer:set-button');
        fireEvent.click(setEncryptionButton);

        await waitForNotification('Password has been set successfully');
        await saveNow(container);


        // Edit encryption
        // Open the encryption dropdown
        const encryptionDropdownButton = getByTestId('composer:encryption-options-button');
        fireEvent.click(encryptionDropdownButton);

        const dropdown = await getDropdown();

        // Click on edit button
        const editEncryptionButton = getByTestIdDefault(dropdown, 'composer:edit-outside-encryption');
        fireEvent.click(editEncryptionButton);

        const passwordInputAfterUpdate = getByTestId('encryption-modal:password-input') as HTMLInputElement;
        const passwordValue = passwordInputAfterUpdate.value;

        expect(passwordValue).toEqual(password);

    });

    it('should be able to remove encryption', async () => {
        prepareMessage({
            localID: ID,
            data: { MIMEType: 'text/plain' as MIME_TYPES },
            messageDocument: { plainText: '' },
        });

        const { getByTestId, getByText, queryByText, container } = await setup();

        const expirationButton = getByTestId('composer:password-button');
        fireEvent.click(expirationButton);
        await tick();

        // modal is displayed and we can set a password
        getByText('Encrypt message');

        const passwordInput = getByTestId('encryption-modal:password-input');
        fireEvent.change(passwordInput, { target: { value: password } });

        const setEncryptionButton = getByTestId('modal-footer:set-button');
        fireEvent.click(setEncryptionButton);

        await waitForNotification('Password has been set successfully');

        // Edit encryption
        // Open the encryption dropdown
        const encryptionDropdownButton = getByTestId('composer:encryption-options-button');
        fireEvent.click(encryptionDropdownButton);

        const dropdown = await getDropdown();

        await waitFor(
            () => expect(getByText(/This message will expire on/)).toBeInTheDocument()
        );
        // Click on remove button
        const editEncryptionButton = getByTestIdDefault(dropdown, 'composer:remove-outside-encryption');
        fireEvent.click(editEncryptionButton);

        expect(queryByText(/This message will expire on/)).toBe(null);

        await saveNow(container);
    });
});
