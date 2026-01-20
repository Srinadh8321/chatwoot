<template>
    <div>
        <!-- Floating Chat Button -->

        <!-- Chat Window -->
        <!-- <Transition> -->
            <div>
                
                <!-- Deep Chat Component -->
                <div class="chat-container">
                    <deep-chat ref="deepChatRef" :connect="chatConfig" :style="chatStyle"  :textInput="textInputConfig"
                        :avatars="true" :requestBodyLimits="requestLimits" :remarkable="{ html: true }"
                        :history="chatHistoryJson" @onMessage="handleMessage" @onResponse="handleResponse"
                        :responseInterceptor="responseInterceptor"  :requestInterceptor="requestInterceptor" />
                       </div>

                <!-- Quick Reply Buttons (if any) -->
                <div v-if="quickReplies.length > 0" class="quick-replies">
                    <button v-for="(reply, index) in quickReplies" :key="index" @click="sendQuickMessage(reply)"
                        class="quick-reply-btn">
                        {{ reply }}
                    </button>
                </div>
            </div>
            
        <!-- </Transition> -->
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWindowScroll } from '@vueuse/core'
// import { useDisplay } from 'vuetify'
import { useStore } from 'vuex'
import 'deep-chat'
import { watch } from 'vue'
import axios from 'axios'

// Router composables
const router = useRouter()
const route = useRoute()
const store=useStore();
const firstTimePanelTypeChange= ref(true);
// const messages= computed(() => store.getters["messagesList/getItems"]);
const contact= computed(() => store.getters["messagesList/getContact"]);
// Props
const props = defineProps({
    primaryColor: {
        type: String,
        default: '#4F46E5'
    },
    showNotification: {
        type: Boolean,
        default: false
    },
    isFullScreen: {
        type: Boolean,
        default: false
    },
    conversationId: {
        type: Number,
        default: null
    },
    panelType:{
        type: String,
        default: 'Copilot'
    }
})

// Reactive state
const emit=defineEmits(['conversationIdChanged']);
const isOpen = ref(props.isFullScreen || false)
const isMinimized = ref(false)
const showPulse = ref(true)
const quickReplies = ref([])
const hasNotification = ref(props.showNotification)
const deepChatRef = ref(null)
// const display = useDisplay()
const chatHistory = ref([])
const summaryText=ref();
const token=ref('')
// Chat configuration
const chatConfig = {
        url: import.meta.env.VITE_BOT_API_URL + '/ai/chat', 
        method: 'POST',
        headers: { token: token.value },
}

function responseInterceptor(response) {
    // console.log('Raw response:', JSON.stringify(response));
    console.log('headers:', response?.meta?.token);
    token.value=response?.meta?.token||'';
    const resText = response?.text;
    const errText = response?.error;
    if (errText) {
        return { text: errText };
    }

    if (resText) {
        // If options are present, set quick replies and return main text
        if (resText.options?.length) {
            return {
                text: resText.text,
                _options: resText.options  // Pass options through the response
            };
        }

        if (typeof resText.text === 'string') {
            return { text: resText.text };
        }

        // If it's a plain string, wrap it in an object for consistency
        if (typeof resText === 'string') {
            return { text: resText };
        }

        // Final fallback for unknown structure
        console.warn('Unknown response.text format:', resText);
        return { text: '' };
    }

    // If no text exists, return the original response
    return response;
}

function requestInterceptor (payload){
    if (!payload.body.messages[0] || payload.body.messages[0].role !== "system") {
        payload.body.messages.unshift({
            role: "system",
            text:summaryText.value 
        });
        payload.headers['X-user-name']=contact.value.additional_attributes?.company_name??''
        payload.headers['X-source']='SERVICE_CRM'
        if(token.value){
            payload.headers['token']=token.value;
        }
    }
    return payload;
}
const textInputConfig = {
    placeholder: { text: 'How may i help you' },
}

const requestLimits = {
    totalMessagesMaxCharLength: 2000,
    maxMessages: 50
}

const { y } = useWindowScroll();

const chatStyle = computed(() => ({
    width: '340px',
    height: '580px',
    borderRadius: '0',
    border: 'none',
    fontFamily: 'Inter, system-ui, sans-serif'
}))

const position = computed(() => {
    return y.value > 200 ? 'bottom-right' : 'bottom-right-initial';
});

// Position classes for floating button
const positionClasses = computed(() => {
    const classes = ['floating-chat-button']
    classes.push(`position-${position.value}`)
    return classes
})

// Position classes for chat window
const chatWindowClasses = computed(() => {
    if (props.isFullScreen) {
        return 'chat-window-fullscreen'
    }
    return 'chat-window-bottom-right'
})

const isMobile = computed(() => false)

const chatHistoryJson = computed(() => {
    if (chatHistory.value.length > 0) {
        return chatHistory.value
    }
    return ''
})

const saveChatHistory = () => {
    try {
        if (deepChatRef.value) {
            let messages = null

            if (typeof deepChatRef.value.getMessages === 'function') {
                messages = deepChatRef.value.getMessages()
            }

            if (messages && Array.isArray(messages) && messages.length > 0) {
                const validMessages = messages.filter(msg =>
                    msg && (msg.role === 'user' || msg.role === 'ai' || msg.text)
                )

                if (validMessages.length > 0) {
                    chatHistory.value = [...validMessages]
                    sessionStorage.setItem('copilot_'+props.conversationId, JSON.stringify(validMessages))
                    return true
                }
            }
        }
        return false
    } catch (error) {
        console.warn('Could not save chat history:', error)
        return false
    }
}

const loadChatHistory = () => {
    try {
        const storedHistory = sessionStorage.getItem('copilot_'+props.conversationId)
         let parsedHistory = JSON.parse(storedHistory||'null');
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            chatHistory.value = parsedHistory
            console.log('Loaded')
            return true
        }
        return true
    } catch (error) {
        console.warn('Could not load chat history from storage:', error)
        return false
    }
}

const clearChatHistory = () => {
    chatHistory.value = []
    sessionStorage.removeItem('copilot_'+props.conversationId)
}

// Methods
const openChat = () => {
    if (isMobile.value) {
        hasNotification.value = false
        showPulse.value = false
        router.push('/opt-chat-bot')
    } else {
        isOpen.value = true
        hasNotification.value = false
        showPulse.value = false
        if (chatHistory.value.length === 0) {
            loadChatHistory()
        }

        isMinimized.value = false
    }
}

const closeChat = () => {
    if (props.isFullScreen) {
        // If in fullscreen mode, navigate back to previous page
        clearChatHistory()
        router.go(-1)
    } else {
        clearChatHistory()
        isOpen.value = false
        isMinimized.value = false
        quickReplies.value = []
    }
}

const minimizeChat = () => {
    if (!props.isFullScreen) {
        saveChatHistory()
        isOpen.value = false
        isMinimized.value = true
        quickReplies.value = []
        setTimeout(() => {
            showPulse.value = true
        }, 100)
    }
}

const toggleMaximize = () => {
    if (props.isFullScreen) {
        // If already in fullscreen, go back to previous page
        saveChatHistory()
        router.go(-1)
    } else {
        const saved = saveChatHistory()
        if (saved || chatHistory.value.length > 0) {
            console.log('History saved, navigating to fullscreen with', chatHistory.value.length, 'messages')
        }
        // Navigate to fullscreen chat page
        isOpen.value = false
        isMinimized.value = true
        quickReplies.value = []
        router.push('/opt-chat-bot')
    }
}

const sendQuickMessage = (message) => {
    if (deepChatRef.value && deepChatRef.value.submitUserMessage) {
        deepChatRef.value.submitUserMessage({ text: message })
        quickReplies.value = []
    }
}

const handleMessage = (message) => {
    setTimeout(() => {
        saveChatHistory()
    }, 100)
}

const handleResponse = (response) => {
    hasNotification.value = !isOpen.value && !props.isFullScreen
    const resText = response?.text;
    if (resText?._options?.length) {
        quickReplies.value = resText._options;
    } else if (resText?.options?.length) {
        quickReplies.value = resText.options;
    } else {
        quickReplies.value = [];
    }
    sendQuickMessage('ok')
    setTimeout(() => {
        saveChatHistory()
    }, 100)
}
// Clear messages function
const clearMessages = () => {
    clearChatHistory()
    quickReplies.value = []
}

// Expose methods for parent components
defineExpose({
    openChat,
    closeChat,
    clearMessages,
    toggleMaximize
})

// Lifecycle
onMounted(() => {
    const historyLoaded = loadChatHistory()
    // If it's fullscreen mode, automatically open
    if (props.isFullScreen) {
        isOpen.value = true
        showPulse.value = false
    } else {
        // Stop pulse animation after 5 seconds for normal mode
        setTimeout(() => {
            showPulse.value = false
        }, 5000)
    }
})
onBeforeUnmount(() => {
    if (isOpen.value || isMinimized.value) {
        saveChatHistory()
    }
    
})
async function getConversationSummary(messages){
    try {
        const resp= await axios.post('http://localhost:8000/ai-tools/conversation/summary',{
            messages:messages
        });
        summaryText.value=resp.data.summary;
        token.value=''
    }
    catch(error){
        console.error('Error fetching conversation summary:', error);
    }
}
watch(()=>props.conversationId, (newId, oldId) => {
    if(newId && oldId){
        emit('conversationIdChanged', newId);
        return;
    }
    if (newId !== oldId) {
        
        firstTimePanelTypeChange.value=true;
        console.log('cleared !')
        const messages= store.getters["messagesList/getItems"]
        
        if(messages.length>0)
            getConversationSummary(messages);
        clearChatHistory();
        deepChatRef.value?.clearMessages();
        loadChatHistory();
    }
},{immediate:true});

watch(()=>props.panelType,(newValue, oldValue)=>{
    console.log('panel type changed to ',newValue,oldValue);
    if(newValue==='Copilot' && firstTimePanelTypeChange.value){
       if(summaryText.value || 'allow'){
            firstTimePanelTypeChange.value=false;
            const resp= deepChatRef.value.submitUserMessage({
                text: `Use conversation summary to assist`
            });
        }
    }
})
</script>

<style scoped>
/* Floating button styles */
.floating-chat-button {
    position: fixed;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #7367f0;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3);
    z-index: 9998;
    border: none;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

.floating-chat-button:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 40px rgba(79, 70, 229, 0.4);
}

.floating-chat-button.pulse {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3);
    }

    50% {
        box-shadow: 0 8px 32px rgba(79, 70, 229, 0.6), 0 0 0 10px rgba(79, 70, 229, 0.1);
    }

    100% {
        box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3);
    }
}

/* Position classes for button */
.position-bottom-right {
    bottom: 96px;
    right: 24px;
    transform: translateY(-10px);
}

.position-bottom-left {
    bottom: 96px;
    left: 24px;
}

.position-bottom-right-initial {
    bottom: 26px;
    right: 24px;
    transform: translateY(0);
}

.position-bottom-left-initial {
    bottom: 26px;
    left: 24px;
}

.position-top-right {
    top: 24px;
    right: 24px;
}

.position-top-left {
    top: 24px;
    left: 24px;
}

.chat-icon {
    width: 22px;
    height: 22px;
}

.notification-dot {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    background: #EF4444;
    border-radius: 50%;
    border: 2px solid white;
    animation: bounce 1s infinite;
}

@keyframes bounce {

    0%,
    20%,
    50%,
    80%,
    100% {
        transform: translateY(0);
    }

    40% {
        transform: translateY(-4px);
    }

    60% {
        transform: translateY(-2px);
    }
}

/* Chat Window Styles */
.chat-window {
    position: fixed;
    background: white;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 9999;
    border: 1px solid #E2E8F0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Normal chat window positioning */
.chat-window-bottom-right {
    width: 380px;
    height: 450px;
    bottom: 80px;
    right: 24px;
}

.chat-window-bottom-left {
    width: 380px;
    height: 450px;
    bottom: 80px;
    left: 24px;
}

.chat-window-top-right {
    width: 380px;
    height: 450px;
    top: 100px;
    right: 24px;
}

.chat-window-top-left {
    width: 380px;
    height: 450px;
    top: 100px;
    left: 24px;
}

/* Fullscreen mode */
.chat-window-fullscreen {
    width: 100vw !important;
    height: 100vh !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    border-radius: 0 !important;
    border: none !important;
    position: fixed !important;
}

.chat-window.fullscreen {
    border-radius: 0;
    border: none;
}

.chat-header {
    background: linear-gradient(135deg, v-bind(primaryColor), #8e90f8);
    color: white;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
}

.chat-header-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.chat-avatar {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.chat-info h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
}

.chat-info .status {
    margin: 0;
    font-size: 11px;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-dot {
    width: 6px;
    height: 6px;
    background: #10B981;
    border-radius: 50%;
    animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.chat-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
}

/* Chat container */
.chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    align-items: right;
    min-height: 300px;
    max-height: 800px;
}

/* Quick replies */
.quick-replies {
    padding: 10px 12px;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-height: 80px;
    overflow-y: auto;
}

.quick-reply-btn {
    background: white;
    border: 1px solid #E2E8F0;
    color: v-bind(primaryColor);
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.quick-reply-btn:hover {
    background: v-bind(primaryColor);
    color: white;
    border-color: v-bind(primaryColor);
}

/* Transitions */
.bounce-enter-active,
.bounce-leave-active {
    transition: all 0.3s ease;
}

.bounce-enter-from,
.bounce-leave-to {
    transform: scale(0);
    opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s ease;
}

.slide-up-enter-from {
    transform: translateY(20px);
    opacity: 0;
}

.slide-up-leave-to {
    transform: translateY(10px);
    opacity: 0;
}

/* Responsive design */
@media (max-width: 768px) {

    .chat-window-bottom-right,
    .chat-window-bottom-left,
    .chat-window-top-right,
    .chat-window-top-left {
        width: calc(100vw - 48px);
        max-width: 350px;
        height: 450px;
    }

    .chat-window-bottom-right,
    .chat-window-bottom-left {
        bottom: 162px;
    }

    .chat-window-bottom-right {
        right: 24px;
    }

    .chat-window-bottom-left {
        left: 24px;
    }
}

@media (max-width: 480px) {

    .chat-window-bottom-right,
    .chat-window-bottom-left,
    .chat-window-top-right,
    .chat-window-top-left {
        width: calc(100vw - 32px);
        height: 400px;
        right: 16px !important;
        left: 16px !important;
        bottom: 20px !important;
    }

    .floating-chat-button {
        width: 38px;
        height: 38px;
        bottom: 80px;
        right: 27px;
    }

    .chat-icon {
        width: 24px;
        height: 24px;
    }
}
</style>