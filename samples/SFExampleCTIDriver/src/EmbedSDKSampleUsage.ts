import Microsoft, {
    IAssignedConversationList,
    IConsultEventData,
    IConversationData,
    IConversationEventBase,
    IConversationLoadedEventData,
    IConversationStatusChangeData,
    IConversationTransferData,
    IHoldChangeEventData,
    IMessageEventData,
    IMuteChangeEventData,
    INewConversationEventData,
    INotesAddedEvent,
    INotification,
    INotificationOptions,
    IPresence,
    ISentimentObject,
    ITranscriptMessage
} from "@ccaas/CCaaSEmbedSDK";

import { conversationReady, onClickToDial } from "./utils";

enum BasePresenceStatus {
	AVAILABLE = "AVAILABLE",
	AWAY = "AWAY",
	BUSY = "BUSY",
	BUSY_DO_NOT_DISTURB = "BUSY_DO_NOT_DISTURB",
	OFFLINE = "OFFLINE"
}

enum NotificationLevels {
	Success = 1,
	Error = 2,
	Warning = 3,
	Information = 4
}

enum OCLiveWorkItemStatus {
	Active = 2,
	WrapUp = 5,
	Closed = 4
}

type EmbedSDK = typeof Microsoft.CCaaS.EmbedSDK;

// Add interface for call tracking
interface CallSession {
    liveWorkItemId: string;
    salesforceCaseId?: string;
    callStartTime?: Date;
    callEndTime?: Date;
    customerInfo?: {
        phoneNumber?: string;
        email?: string;
        name?: string;
    };
}

// Store active call sessions
const activeCalls = new Map<string, CallSession>();

export function embedSDKSampleUsage(): void {
    const embedSDK: EmbedSDK = (window as any).Microsoft.CCaaS.EmbedSDK;
    if (embedSDK) {

        embedSDK.conversation.onNotesAdded((noteText: INotesAddedEvent) => {
            console.log("Embed SDK New Note Created", noteText);
        });

        embedSDK.conversation.onConversationLoaded(async (conversationData: IConversationLoadedEventData) => {
            console.log("Embed SDK Conversation Loaded", conversationData);
            getFocusedConversationId(embedSDK);
            const conversationDetails: Partial<IConversationData> = await embedSDK.conversation.getConversationData(conversationData.liveWorkItemId, ['msdyn_isoutbound', 'msdyn_channel', 'subject']);
            
            // Initialize call session tracking
            await initializeCallSession(conversationData, conversationDetails);
            
            await conversationReady(conversationData, conversationDetails);
            presenceAPIs(embedSDK);
        });

        embedSDK.conversation.onTransfer((conversationTransferData: IConversationTransferData) => {
            console.log("Embed SDK Conversation Transferred", conversationTransferData);
        });

        embedSDK.conversation.onStatusChange(async (conversationData: IConversationStatusChangeData) => {
            console.log("Embed SDK Conversation State Changed", conversationData);

            if (conversationData.statusCode === OCLiveWorkItemStatus.Closed) {
                // Record call end time and update Salesforce Case
                await recordCallEndTime(conversationData.liveWorkItemId);
                getTranscript(embedSDK, conversationData.liveWorkItemId);
            }
        });

        embedSDK.conversation.onNewMessage((messageData: IMessageEventData) => {
            console.log("Embed SDK New Message", messageData);
        });

        embedSDK.conversation.onAccept(async (eventData: IConversationEventBase) => {
            console.log("Embed SDK Conversation Accepted", eventData);
            
            // Record call start time
            await recordCallStartTime(eventData.liveWorkItemId);
            
            addNewNotification(embedSDK);
            getAssignedConversationsList(embedSDK);
            getConversationData(embedSDK, eventData.liveWorkItemId);
            retrieveRecord(embedSDK, eventData.liveWorkItemId);
            retrieveMultipleRecords(embedSDK, eventData.liveWorkItemId);
        });

        embedSDK.conversation.onReject((eventData: IConversationEventBase) => {
            console.log("Embed SDK Conversation Rejected", eventData);
        });

        embedSDK.conversation.onConsultStart((consultData: IConsultEventData) => {
            console.log("Embed SDK Consult Started", consultData);
        });

        embedSDK.conversation.onConsultEnd((consultData: IConsultEventData) => {
            console.log("Embed SDK Consult Ended", consultData);
        });

        embedSDK.conversation.onCustomerSentimentChange((sentimentData: ISentimentObject) => {
            console.log("Embed SDK Customer Sentiment Changed", sentimentData);
        });

        embedSDK.notification.onNewConversationNotification((conversationData: INewConversationEventData) => {
            console.log("Embed SDK New Conversation Notification", conversationData);
        });

        embedSDK.notification.onNewNotification((notificationData: INotification) => {
            console.log("Embed SDK New Notification", notificationData);
        });

        embedSDK.presence.onPresenceChange((presenceData: IPresence) => {
            console.log("Embed SDK Agent Presence Changed", presenceData);
        });

        embedSDK.voiceOrVideoCalling.onHoldChange((holdChangeData: IHoldChangeEventData) => {
            console.log("Embed SDK Call hold changed", holdChangeData);
        });

        embedSDK.voiceOrVideoCalling.onMuteChange((muteChangeData: IMuteChangeEventData) => {
            console.log("Embed SDK Call mute changed", muteChangeData);
        });

        embedSDK.ctiDriver.onSoftPhonePanelHeightChange((height: number) => {
            setSoftPhonePanelHeight(height);
        });

        embedSDK.ctiDriver.onSoftPhonePanelWidthChange((width: number) => {
            setSoftPhonePanelWidth(width);
        });

        embedSDK.ctiDriver.onSoftPhonePanelVisibilityChange((visibility: boolean) => {
           setSoftPhonePanelVisibility(visibility);
        });

        onClickToDial(embedSDK.ctiDriver.clickToDial);
    }

}


const presenceAPIs = (embedSDK: EmbedSDK) => {
    embedSDK.presence.getPresence().then((presenceInfo: IPresence) => {
        console.log("Embed SDK Agent's Current Presence:", presenceInfo);
    }).catch((error) => {
        console.error("Embed SDK Failed to retrieve agent's presence status:", error);
    });

    embedSDK.presence.getPresenceOptions().then((presenceOptions: IPresence[]) => {
        console.log("Embed SDK Available Presence Options:", presenceOptions);

        const busyDNDOption = presenceOptions.find((option) => option.basePresenceStatus === BasePresenceStatus.BUSY_DO_NOT_DISTURB);
        if (busyDNDOption) {
            embedSDK.presence.setPresence(busyDNDOption.presenceId).then(() => {
                console.log("Embed SDK Agent's presence status has been updated to 'busyDND'.");
            }).catch((error) => {
                console.error("Embed SDK Failed to update agent's presence status:", error);
            });
        } else {
            console.warn("Embed SDK 'busyDND' presence option not found.");
        }
    }).catch((error) => {
        console.error("Embed SDK Failed to retrieve presence options:", error);
    });
}

const getTranscript = (embedSDK: EmbedSDK, liveWorkItemId: string) => {
    embedSDK.conversation.getTranscript(liveWorkItemId)
        .then((transcript: ITranscriptMessage[]) => {
            console.log("Embed SDK Transcript", transcript);
        }).catch((error) => {
            console.error("Embed SDK Failed to retrieve transcript:", error);
        });
}

const addNewNotification = (embedSDK: EmbedSDK) => {
    const notificationOptions: INotificationOptions = {
        level: NotificationLevels.Information,
        message: "New conversation assigned to you!",
    };

    embedSDK.notification.addNewNotification(notificationOptions)
        .then((notificationId: string) => {
            console.log("Embed SDK Notification added with ID:", notificationId);
        })
        .catch((error) => {
            console.error("Embed SDK Failed to add notification:", error);
        });
}

const getAssignedConversationsList = (embedSDK: EmbedSDK) => {
    embedSDK.conversation.getAssignedConversationsList(OCLiveWorkItemStatus.Active).then((conversationList: IAssignedConversationList) => {
        console.log("Embed SDK getAssignedConversationsList: Assigned Conversations:", conversationList);
    }).catch((error) => {
        console.error("Embed SDK getAssignedConversationsList: Failed to retrieve assigned conversations:", error);
    });
}

const getFocusedConversationId = (embedSDK: EmbedSDK) => {
    embedSDK.conversation.getFocusedConversationId().then((conversationId: string) => {
        console.log("Embed SDK getFocusedConversationId:  Focused Conversation ID:", conversationId);
    }).catch((error) => {
        console.error("Embed SDK getFocusedConversationId:  Failed to retrieve focused conversation ID:", error);
    });
}

const getConversationData = (embedSDK: EmbedSDK, liveWorkItemId: string) => {
    const columns = ["msdyn_ocliveworkitemid", "msdyn_channel", "statuscode", "msdyn_createdon"];
    embedSDK.conversation.getConversationData(liveWorkItemId, columns)
        .then((data: Partial < IConversationData > ) => {
            console.log("Embed SDK Conversation data:", data);
        }).catch((error) => {
            console.error("Embed SDK Failed to retrieve conversation data:", error);
        });
}

const retrieveRecord = (embedSDK: EmbedSDK, liveWorkItemId: string) => {
    embedSDK.dataverse.retrieveRecord("msdyn_ocliveworkitems", liveWorkItemId, "?$select=msdyn_createdon")
        .then((data) => console.log("Embed SDK  Retrieve record Response:", data))
        .catch((error) => console.error("Embed SDK Failed to retrieve record:", error));
}

const retrieveMultipleRecords = (embedSDK: EmbedSDK, liveWorkItemId: string) => {
    const fetchXml = `<fetch top="50"><entity name="msdyn_ocliveworkitem"><attribute name="msdyn_ocliveworkitemid"/><attribute name="msdyn_channel"/><attribute name="statuscode"/><attribute name="msdyn_createdon"/><filter><condition attribute="msdyn_ocliveworkitemid" operator="eq" value="${liveWorkItemId}"/></filter></entity></fetch>`;

    embedSDK.dataverse.retrieveMultipleRecords("msdyn_ocliveworkitems", `?fetchXml=${fetchXml}`)
        .then((data) => console.log("Embed SDK  Retrieve multiple records Response:", data))
        .catch((error) => console.error("Embed SDK Failed to retrieve multiple records:", error));
}

 const setSoftPhonePanelWidth = (width: number) => {
    window.sforce.opencti.setSoftphonePanelWidth({
        widthPX: width
    });
}

 const setSoftPhonePanelHeight = (height: number) => {
    window.sforce.opencti.setSoftphonePanelHeight({
        heightPX: height
    });
}

export const setSoftPhonePanelVisibility = (status: boolean = true) => {
    const isPanelVisible = window.sforce.opencti.isSoftphonePanelVisible({
        callback: (response) => {
            if (response.success) {
                return response.returnValue.visible
            } else {
                throw new Error(response.errors);
            }
        }
    });

    if (status !== isPanelVisible) {
        window.sforce.opencti.setSoftphonePanelVisibility({
            visible: status
        });
    }
}

/**
 * Initialize call session tracking when conversation loads
 */
async function initializeCallSession(conversationData: IConversationLoadedEventData, conversationDetails: Partial<IConversationData>): Promise<void> {    const callSession: CallSession = {
        liveWorkItemId: conversationData.liveWorkItemId,
        customerInfo: {
            phoneNumber: conversationData.customerPhoneNumber,
            email: undefined, // Email not available in IConversationLoadedEventData
            name: conversationData.customerName
        }
    };

    // Store the call session
    activeCalls.set(conversationData.liveWorkItemId, callSession);
    
    console.log("Call session initialized:", callSession);
}

/**
 * Record call start time and create/find Salesforce Case
 */
async function recordCallStartTime(liveWorkItemId: string): Promise<void> {
    const callSession = activeCalls.get(liveWorkItemId);
    if (!callSession) {
        console.error("Call session not found for liveWorkItemId:", liveWorkItemId);
        return;
    }

    // Record the call start time
    callSession.callStartTime = new Date();
    
    try {
        // Find or create Salesforce Case
        const caseId = await findOrCreateSalesforceCase(callSession);
        callSession.salesforceCaseId = caseId;

        // Update Case with call start time
        await updateSalesforceCaseCallTimes(caseId, callSession.callStartTime, null);
        
        console.log(`Call start time recorded for Case ${caseId}:`, callSession.callStartTime);
        
    } catch (error) {
        console.error("Failed to record call start time:", error);
    }
}

/**
 * Record call end time and update Salesforce Case
 */
async function recordCallEndTime(liveWorkItemId: string): Promise<void> {
    const callSession = activeCalls.get(liveWorkItemId);
    if (!callSession) {
        console.error("Call session not found for liveWorkItemId:", liveWorkItemId);
        return;
    }

    // Record the call end time
    callSession.callEndTime = new Date();
    
    try {
        if (callSession.salesforceCaseId) {
            // Update Case with call end time
            await updateSalesforceCaseCallTimes(
                callSession.salesforceCaseId, 
                callSession.callStartTime, 
                callSession.callEndTime
            );
            
            // Calculate call duration
            const duration = callSession.callStartTime && callSession.callEndTime 
                ? (callSession.callEndTime.getTime() - callSession.callStartTime.getTime()) / 1000 
                : 0;
                
            console.log(`Call completed for Case ${callSession.salesforceCaseId}:`, {
                startTime: callSession.callStartTime,
                endTime: callSession.callEndTime,
                duration: `${duration} seconds`
            });
            
            // Optionally save call log
            await saveCallLog(callSession, duration);
        }
        
    } catch (error) {
        console.error("Failed to record call end time:", error);
    } finally {
        // Clean up the call session
        activeCalls.delete(liveWorkItemId);
    }
}

/**
 * Find existing Case or create new one for the customer
 */
async function findOrCreateSalesforceCase(callSession: CallSession): Promise<string> {
    return new Promise((resolve, reject) => {
        // First, try to find existing customer record
        if (callSession.customerInfo?.phoneNumber) {
            window.sforce.opencti.searchAndScreenPop({
                searchParams: callSession.customerInfo.phoneNumber,
                callType: window.sforce.opencti.CALL_TYPE.INBOUND,
                deferred: true,
                callback: async (response) => {
                    if (response.success && response.returnValue) {
                        // Customer found, look for open Case
                        const contactId = findContactFromSearchResults(response.returnValue);
                        if (contactId) {
                            const caseId = await findOpenCaseForContact(contactId) || await createNewCase(contactId, callSession);
                            resolve(caseId);
                        } else {
                            // No contact found, create new Case without contact
                            const caseId = await createNewCase(null, callSession);
                            resolve(caseId);
                        }
                    } else {
                        // Customer not found, create new Case
                        const caseId = await createNewCase(null, callSession);
                        resolve(caseId);
                    }
                }
            });
        } else {
            // No phone number, create new Case
            createNewCase(null, callSession).then(resolve).catch(reject);
        }
    });
}

/**
 * Find Contact ID from search results
 */
function findContactFromSearchResults(searchResults: any): string | null {
    for (const recordId in searchResults) {
        if (searchResults.hasOwnProperty(recordId)) {
            const record = searchResults[recordId];
            if (record && record.RecordType === 'Contact') {
                return recordId;
            }
        }
    }
    return null;
}

/**
 * Find open Case for Contact using runApex
 */
async function findOpenCaseForContact(contactId: string): Promise<string | null> {
    return new Promise((resolve) => {
        const apexCode = `
            List<Case> cases = [
                SELECT Id FROM Case 
                WHERE ContactId = '${contactId}' 
                AND Status NOT IN ('Closed', 'Resolved')
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];
            return cases.isEmpty() ? null : cases[0].Id;
        `;

        window.sforce.opencti.runApex({
            apexClass: null,
            methodName: null,
            methodParams: null,
            callback: (response) => {
                if (response.success && response.returnValue) {
                    resolve(response.returnValue);
                } else {
                    resolve(null);
                }
            },
            apexCode: apexCode
        });
    });
}

/**
 * Create new Salesforce Case
 */
async function createNewCase(contactId: string | null, callSession: CallSession): Promise<string> {
    return new Promise((resolve, reject) => {
        const caseData = {
            Subject: `Contact Center Call - ${callSession.customerInfo?.name || 'Unknown Customer'}`,
            Origin: 'Phone',
            Status: 'New',
            Priority: 'Medium',
            Description: `Inbound call received at ${new Date().toLocaleString()}`,
            // Add custom fields for call tracking
            Call_Start_Time__c: null, // Will be updated when call starts
            Call_End_Time__c: null,   // Will be updated when call ends
        };

        if (contactId) {
            (caseData as any).ContactId = contactId;
        }

        const apexCode = `
            Case newCase = new Case();
            newCase.Subject = '${caseData.Subject}';
            newCase.Origin = '${caseData.Origin}';
            newCase.Status = '${caseData.Status}';
            newCase.Priority = '${caseData.Priority}';
            newCase.Description = '${caseData.Description}';
            ${contactId ? `newCase.ContactId = '${contactId}';` : ''}
            
            insert newCase;
            return newCase.Id;
        `;

        window.sforce.opencti.runApex({
            apexClass: null,
            methodName: null,
            methodParams: null,
            callback: (response) => {
                if (response.success && response.returnValue) {
                    console.log("New Salesforce Case created:", response.returnValue);
                    resolve(response.returnValue);
                } else {
                    console.error("Failed to create Salesforce Case:", response.errors);
                    reject(new Error("Failed to create Case"));
                }
            },
            apexCode: apexCode
        });
    });
}

/**
 * Update Salesforce Case with call start and end times
 */
async function updateSalesforceCaseCallTimes(caseId: string, startTime: Date | null, endTime: Date | null): Promise<void> {
    return new Promise((resolve, reject) => {
        const startTimeStr = startTime ? startTime.toISOString() : 'null';
        const endTimeStr = endTime ? endTime.toISOString() : 'null';

        const apexCode = `
            Case caseToUpdate = [SELECT Id FROM Case WHERE Id = '${caseId}' LIMIT 1];
            ${startTime ? `caseToUpdate.Call_Start_Time__c = DateTime.valueOf('${startTime.toISOString().replace('T', ' ').replace('Z', '')}');` : ''}
            ${endTime ? `caseToUpdate.Call_End_Time__c = DateTime.valueOf('${endTime.toISOString().replace('T', ' ').replace('Z', '')}');` : ''}
            
            update caseToUpdate;
            return 'SUCCESS';
        `;

        window.sforce.opencti.runApex({
            apexClass: null,
            methodName: null,
            methodParams: null,
            callback: (response) => {
                if (response.success) {
                    console.log(`Case ${caseId} updated with call times`);
                    resolve();
                } else {
                    console.error("Failed to update Case call times:", response.errors);
                    reject(new Error("Failed to update Case"));
                }
            },
            apexCode: apexCode
        });
    });
}

/**
 * Save detailed call log as Activity or custom object
 */
async function saveCallLog(callSession: CallSession, duration: number): Promise<void> {
    if (!callSession.salesforceCaseId) return;

    return new Promise((resolve, reject) => {
        const logData = {
            subject: 'Contact Center Call Log',
            description: `Call Duration: ${duration} seconds\nStart: ${callSession.callStartTime}\nEnd: ${callSession.callEndTime}`,
            whatId: callSession.salesforceCaseId,
            activityDateTime: callSession.callStartTime
        };

        window.sforce.opencti.saveLog({
            value: JSON.stringify(logData),
            callback: (response) => {
                if (response.success) {
                    console.log("Call log saved successfully");
                    resolve();
                } else {
                    console.error("Failed to save call log:", response.errors);
                    reject(new Error("Failed to save call log"));
                }
            }
        });
    });
}