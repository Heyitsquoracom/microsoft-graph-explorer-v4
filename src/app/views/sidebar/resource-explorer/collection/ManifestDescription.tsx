import {
  ChoiceGroup,
  FontSizes, FontWeights, IChoiceGroupOption, Link,
  PrimaryButton,
  VerticalDivider, getTheme, mergeStyleSets
} from '@fluentui/react';
import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';

import { useAppSelector } from '../../../../../store';
import { componentNames, eventTypes, telemetry } from '../../../../../telemetry';
import { APIManifest } from '../../../../../types/api-manifest';
import { PopupsComponent } from '../../../../services/context/popups-context';
import { API_MANIFEST_SPEC_PAGE, PERMS_SCOPE } from '../../../../services/graph-constants';
import { useCollectionPermissions } from '../../../../services/hooks/useCollectionPermissions';
import { downloadToLocal, trackDownload } from '../../../common/download';
import { generateAPIManifest } from './api-manifest.util';
import { translateMessage } from '../../../../utils/translate-messages';
import { genericCopy } from '../../../common/copy';


const ManifestDescription: React.FC<PopupsComponent<null>> = () => {
  const { permissions, isFetching } = useCollectionPermissions();
  const [manifest, setManifest] = useState<APIManifest>();
  const [isGeneratingManifest, setIsGeneratingManifest] = useState<boolean>(false);
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [dots, setDots] = useState<string>('.');

  const manifestStyle = mergeStyleSets(
    {
      root: {
        lineHeight: 'normal', width: '100%',
        h3: {
          fontSize: FontSizes.size16,
          fontWeight: FontWeights.semibold
        }
      },
      steps: {
        background: getTheme().palette.neutralLighter,
        margin: 5,
        padding: 5,
        ul: {
          listStyleType: 'circle',
          marginLeft: 18
        },
        code: {
          background: getTheme().palette.neutralLight,
          marginLeft: 2,
          FontStyle: 'italic'
        }
      },
      actionButtons: {
        display: 'flex',
        gap: '8px'
      },
      spinner: {
        marginRight: '4px',
        marginLeft: '4px'
      },
      permissionsButtons: {
        display: 'flex',
        flexDirection: 'row',
        gap: '50px',
        paddingTop: '15px',
        paddingBottom: '15px'
      }
    }
  );

  const options: IChoiceGroupOption[] = [
    {
      key: `${PERMS_SCOPE.WORK}`,
      text: translateMessage('Delegated work'),
      disabled: isGeneratingManifest
    },
    {
      key: `${PERMS_SCOPE.APPLICATION}`,
      text: translateMessage('Application permissions'),
      disabled: isGeneratingManifest
    },
    {
      key: `${PERMS_SCOPE.APPLICATION}_${PERMS_SCOPE.WORK}`,
      text: translateMessage('Delegated & application permissions'),
      disabled: isGeneratingManifest
    }
  ];

  const { collections } = useAppSelector(
    (state) => state
  );
  const items = collections ? collections.find(k => k.isDefault)!.paths : [];

  useEffect(() => {
    if(!isFetching && selectedScope !== ''){
      const generatedManifest = generateAPIManifest(items, permissions, selectedScope);
      if(Object.keys(generatedManifest).length > 0){
        setIsGeneratingManifest(false);
        setManifest(generatedManifest);
      }
    }
  }, [selectedScope, isFetching]);

  useEffect(() => {
    const interval = setInterval(() => {
      if(dots === '...'){
        setDots('.');
        return;
      }
      setDots(dots + '.');
    }, 1000);

    return () => {
      clearInterval(interval);
    }
  }, [dots]);

  const downloadManifest = () => {
    if (!manifest) { return; }
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `${manifest.publisher.name}-API-Manifest-${timestamp}.json`;
    downloadToLocal(manifest, filename);
    trackDownload(filename, componentNames.DOWNLOAD_API_MANIFEST_BUTTON);
  }

  const openManifestInVisualStudio = () => {
    const base64UrlEncodedManifest = btoa(JSON.stringify(manifest));
    try{
      genericCopy(base64UrlEncodedManifest);

      // New version of URL to be provided
      // eslint-disable-next-line max-len
      const manifestContentUrl = `vscode://ms-graph.kiota/OpenManifest?manifestContent=${base64UrlEncodedManifest}&apiIdentifier=graph`;
      window.open(manifestContentUrl, '_blank');
      trackVSCodeButtonClick();
    }
    catch{
      telemetry.trackEvent(eventTypes.BUTTON_CLICK_EVENT, {
        ComponentName: componentNames.OPEN_MANIFEST_IN_VISUAL_STUDIO_CODE_BUTTON,
        Error: 'Failed to copy manifest to clipboard'
      });
    }
  }

  const onSelectionChange = useCallback((ev: FormEvent<HTMLElement | HTMLInputElement> | undefined,
    option: IChoiceGroupOption | undefined) => {
    setSelectedScope(option!.key);
    setIsGeneratingManifest(true);
  }, []);

  const trackVSCodeButtonClick = () => {
    telemetry.trackEvent(eventTypes.BUTTON_CLICK_EVENT, {
      ComponentName: componentNames.OPEN_MANIFEST_IN_VISUAL_STUDIO_CODE_BUTTON
    });
  }

  const showFetchingPermissionsText = () => {
    const idString = `Fetching permissions for your items ${dots}`
    return (
      <FormattedMessage id={idString}/>
    )
  }

  return (
    <div className={manifestStyle.root}>
      <FormattedMessage id='API manifest description' />
      <br/>
      {isFetching && <br/>}
      {isFetching && showFetchingPermissionsText()}
      {isFetching && <br/>}
      <br/>
      <VerticalDivider />

      <FormattedMessage id='Permissions choice' />
      <ChoiceGroup options={options}
        onChange={onSelectionChange} label=''
        styles={{flexContainer: manifestStyle.permissionsButtons}}
      />

      <VerticalDivider />

      <FormattedMessage id='To generate client'/>
      <br/>
      <FormattedMessage id='Use VS Code'/>
      <Link href='https://learn.microsoft.com/en-us/openapi/kiota/overview'
        target='_blank'
      >
        &nbsp;Kiota
      </Link>
      &nbsp;
      <FormattedMessage id='VS Code extension'/>
      <br/>
      <br/>

      <PrimaryButton disabled={selectedScope === '' || isGeneratingManifest || isFetching}
        onClick={openManifestInVisualStudio}>
        {isGeneratingManifest && <FormattedMessage id='Hold on, we are creating the manifest' />}
        {!isGeneratingManifest && <FormattedMessage id='Open in VS Code' />}
      </PrimaryButton>

      <VerticalDivider />
      <br />
      <br />
      <FormattedMessage id='Use Kiota CLI' />
      <Link
        href='https://aka.ms/get/kiota'
        target='_blank'
      >
        &nbsp;Kiota CLI
      </Link>
      <br/>
      <div className={manifestStyle.steps}>
        Steps:
        <ul>
          <li>Download the API Manifest</li>
          <li>Install the Kiota CLI</li>
          <li>Run the command "kiota generate -i
            <code>path-to-manifest</code> -o
            <code>output-folder</code> -l
            <code>language</code>"
          </li>
        </ul>
      </div>
      <VerticalDivider />
      <br/>
      <PrimaryButton disabled={selectedScope === '' || isGeneratingManifest || isFetching}
        onClick={downloadManifest}>
        {isGeneratingManifest && <FormattedMessage id='Hold on, we are creating the manifest' />}
        {!isGeneratingManifest && <FormattedMessage id='Download API Manifest' />}
      </PrimaryButton>
      <br/>
      To learn more about the API Manifest,
      visit the <Link href={API_MANIFEST_SPEC_PAGE} target='_blank' >API Manifest specification</Link> page.
    </div>
  )
}

export default ManifestDescription