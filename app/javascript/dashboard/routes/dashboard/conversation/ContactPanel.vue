<script setup>
import { computed, watch, onMounted, ref } from 'vue';
import {
  useMapGetter,
  useFunctionGetter,
  useStore,
} from 'dashboard/composables/store';
import { useUISettings } from 'dashboard/composables/useUISettings';

import AccordionItem from 'dashboard/components/Accordion/AccordionItem.vue';
import ContactConversations from './ContactConversations.vue';
import ConversationAction from './ConversationAction.vue';
import ConversationParticipant from './ConversationParticipant.vue';
import ContactInfo from './contact/ContactInfo.vue';
import ContactNotes from './contact/ContactNotes.vue';
import ConversationInfo from './ConversationInfo.vue';
import CustomAttributes from './customAttributes/CustomAttributes.vue';
import Draggable from 'vuedraggable';
import MacrosList from './Macros/List.vue';
import ShopifyOrdersList from 'dashboard/components/widgets/conversation/ShopifyOrdersList.vue';
import SidebarActionsHeader from 'dashboard/components-next/SidebarActionsHeader.vue';
import LinearIssuesList from 'dashboard/components/widgets/conversation/linear/IssuesList.vue';
import LinearSetupCTA from 'dashboard/components/widgets/conversation/linear/LinearSetupCTA.vue';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import  Copilot from 'dashboard/routes/dashboard/conversation/Copilot.vue';
const props = defineProps({
  conversationId: {
    type: [Number, String],
    required: true,
  },
  inboxId: {
    type: Number,
    default: undefined,
  },
});

const {
  updateUISettings,
  isContactSidebarItemOpen,
  conversationSidebarItemsOrder,
  toggleSidebarUIState,
} = useUISettings();

const dragging = ref(false);
const conversationSidebarItems = ref([]);

const currentAccountId = useMapGetter('getCurrentAccountId');

const isFeatureEnabledonAccount = useMapGetter(
  'accounts/isFeatureEnabledonAccount'
);

const shopifyIntegration = useFunctionGetter(
  'integrations/getIntegration',
  'shopify'
);

const isShopifyFeatureEnabled = computed(
  () => shopifyIntegration.value.enabled
);

const linearIntegration = useFunctionGetter(
  'integrations/getIntegration',
  'linear'
);

const isLinearIntegrationEnabled = computed(
  () => linearIntegration.value?.enabled || false
);

const isLinearFeatureEnabled = isFeatureEnabledonAccount.value(
  currentAccountId.value,
  FEATURE_FLAGS.LINEAR
);

const store = useStore();
const currentChat = useMapGetter('getSelectedChat');
const conversationId = computed(() => props.conversationId);
const conversationMetadataGetter = useMapGetter(
  'conversationMetadata/getConversationMetadata'
);
const currentConversationMetaData = computed(() =>
  conversationMetadataGetter.value(conversationId.value)
);
const conversationAdditionalAttributes = computed(
  () => currentConversationMetaData.value.additional_attributes || {}
);

const channelType = computed(() => currentChat.value.meta?.channel);

const contactGetter = useMapGetter('contacts/getContact');
const contactId = computed(() => currentChat.value.meta?.sender?.id);
const contact = computed(() =>{
const contactObj= contactGetter.value(contactId.value)
  store.dispatch("messagesList/setContact", contactObj);
return contactObj;
});
const messages= computed(() => currentChat.value.messages);
watch(messages, (newMessages) => {
  const msgs=newMessages.filter(msg=>msg.sender?.type).map(msg => {
    return {"role":msg.sender.type, 
    "content":msg.content}
  });
  console.log("messages in messagelist.vue",msgs);
  store.dispatch("messagesList/setItems", msgs);
}); 
const contactAdditionalAttributes = computed(
  () => contact.value.additional_attributes || {}
);

const getContactDetails = () => {
  if (contactId.value) {
    store.dispatch('contacts/show', { id: contactId.value });
  }
};
const panelType=ref('Contact');



const onDragEnd = () => {
  dragging.value = false;
  updateUISettings({
    conversation_sidebar_items_order: conversationSidebarItems.value,
  });
};

const closeContactPanel = () => {
  updateUISettings({
    is_contact_sidebar_open: false,
    is_copilot_panel_open: false,
  });
};
watch(contactId, (newContactId, prevContactId) => {
  if (newContactId && newContactId !== prevContactId) {
    panelType.value='Contact';
    closeContactPanel()
    getContactDetails();
  }
});
onMounted(() => {
  conversationSidebarItems.value = conversationSidebarItemsOrder.value;
  getContactDetails();
  store.dispatch('attributes/get', 0);
  // Load integrations to ensure linear integration state is available
  store.dispatch('integrations/get', 'linear');
});
</script>

<template>
  <div class="w-full">
    <SidebarActionsHeader
      :title="$t('CONVERSATION.SIDEBAR.CONTACT')"
      :buttons="[$t('CONVERSATION.SIDEBAR.CONTACT'),$t('CONVERSATION.SIDEBAR.COPILOT')]"
       @close="closeContactPanel"
      @click="panelType = $event"
      :tab-active="panelType"
    />
    <div v-if="panelType==='Contact'" >
      <ContactInfo :contact="contact" :channel-type="channelType" />
      <div class="pb-8 list-group px-2">
        <Draggable
          :list="conversationSidebarItems"
          animation="200"
          ghost-class="ghost"
          handle=".drag-handle"
          item-key="name"
          class="flex flex-col gap-3"
          @start="dragging = true"
          @end="onDragEnd"
        >
          <template #item="{ element }">
            <div
              v-if="element.name === 'conversation_actions'"
              class="conversation--actions"
            >
              <AccordionItem
                :title="$t('CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_ACTIONS')"
                :is-open="isContactSidebarItemOpen('is_conv_actions_open')"
                @toggle="
                  value => toggleSidebarUIState('is_conv_actions_open', value)
                "
              >
                <ConversationAction
                  :conversation-id="conversationId"
                  :inbox-id="inboxId"
                />
              </AccordionItem>
            </div>
            <div
              v-else-if="element.name === 'conversation_participants'"
              class="conversation--actions"
            >
              <AccordionItem
                :title="$t('CONVERSATION_PARTICIPANTS.SIDEBAR_TITLE')"
                :is-open="isContactSidebarItemOpen('is_conv_participants_open')"
                @toggle="
                  value =>
                    toggleSidebarUIState('is_conv_participants_open', value)
                "
              >
                <ConversationParticipant
                  :conversation-id="conversationId"
                  :inbox-id="inboxId"
                />
              </AccordionItem>
            </div>
            <div v-else-if="element.name === 'conversation_info'">
              <AccordionItem
                :title="$t('CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_INFO')"
                :is-open="isContactSidebarItemOpen('is_conv_details_open')"
                compact
                @toggle="
                  value => toggleSidebarUIState('is_conv_details_open', value)
                "
              >
                <ConversationInfo
                  :conversation-attributes="conversationAdditionalAttributes"
                  :contact-attributes="contactAdditionalAttributes"
                />
              </AccordionItem>
            </div>
            <div v-else-if="element.name === 'contact_attributes'">
              <AccordionItem
                :title="$t('CONVERSATION_SIDEBAR.ACCORDION.CONTACT_ATTRIBUTES')"
                :is-open="isContactSidebarItemOpen('is_contact_attributes_open')"
                compact
                @toggle="
                  value =>
                    toggleSidebarUIState('is_contact_attributes_open', value)
                "
              >
                <CustomAttributes
                  attribute-type="contact_attribute"
                  attribute-from="conversation_contact_panel"
                  :contact-id="contact.id"
                  :empty-state-message="
                    $t('CONVERSATION_CUSTOM_ATTRIBUTES.NO_RECORDS_FOUND')
                  "
                />
              </AccordionItem>
            </div>
            <div v-else-if="element.name === 'previous_conversation'">
              <AccordionItem
                v-if="contact.id"
                :title="
                  $t('CONVERSATION_SIDEBAR.ACCORDION.PREVIOUS_CONVERSATION')
                "
                :is-open="isContactSidebarItemOpen('is_previous_conv_open')"
                compact
                @toggle="
                  value => toggleSidebarUIState('is_previous_conv_open', value)
                "
              >
                <ContactConversations
                  :contact-id="contact.id"
                  :conversation-id="conversationId"
                />
              </AccordionItem>
            </div>
            <woot-feature-toggle
              v-else-if="element.name === 'macros'"
              feature-key="macros"
            >
              <AccordionItem
                :title="$t('CONVERSATION_SIDEBAR.ACCORDION.MACROS')"
                :is-open="isContactSidebarItemOpen('is_macro_open')"
                compact
                @toggle="value => toggleSidebarUIState('is_macro_open', value)"
              >
                <MacrosList :conversation-id="conversationId" />
              </AccordionItem>
            </woot-feature-toggle>
            <div
              v-else-if="
                element.name === 'linear_issues' && isLinearFeatureEnabled
              "
            >
              <AccordionItem
                :title="$t('CONVERSATION_SIDEBAR.ACCORDION.LINEAR_ISSUES')"
                :is-open="isContactSidebarItemOpen('is_linear_issues_open')"
                compact
                @toggle="
                  value => toggleSidebarUIState('is_linear_issues_open', value)
                "
              >
                <LinearSetupCTA v-if="!isLinearIntegrationEnabled" />
                <LinearIssuesList v-else :conversation-id="conversationId" />
              </AccordionItem>
            </div>
            <div
              v-else-if="
                element.name === 'shopify_orders' && isShopifyFeatureEnabled
              "
            >
              <AccordionItem
                :title="$t('CONVERSATION_SIDEBAR.ACCORDION.SHOPIFY_ORDERS')"
                :is-open="isContactSidebarItemOpen('is_shopify_orders_open')"
                compact
                @toggle="
                  value => toggleSidebarUIState('is_shopify_orders_open', value)
                "
              >
                <ShopifyOrdersList :contact-id="contactId" />
              </AccordionItem>
            </div>
            <div v-else-if="element.name === 'contact_notes'">
              <AccordionItem
                :title="$t('CONVERSATION_SIDEBAR.ACCORDION.CONTACT_NOTES')"
                :is-open="isContactSidebarItemOpen('is_contact_notes_open')"
                compact
                @toggle="
                  value => toggleSidebarUIState('is_contact_notes_open', value)
                "
              >
                <ContactNotes :contact-id="contactId" />
              </AccordionItem>
            </div>
          </template>
        </Draggable>
      </div>
    </div>
    <div v-show="panelType==='Copilot'">
      <Copilot :conversation-id="conversationId" :panelType="panelType" @conversationIdChanged="()=>closeContactPanel()" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
::v-deep {
  .contact--profile {
    @apply pb-1 border-b border-solid border-n-weak;
  }

  .conversation--actions .multiselect-wrap--small {
    .multiselect {
      @apply box-border pl-6;
    }

    .multiselect__element {
      span {
        @apply w-full;
      }
    }
  }
}
</style>
