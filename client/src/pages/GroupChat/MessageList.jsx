import React from 'react';
import { Loader2 } from "lucide-react";
import MessageItem from "../../components/chat/MessageItem";

const MessageList = React.memo(({ messages, isFetchingOld, messageRefs, lastMsgRef, ...props }) => (
    <>
        {isFetchingOld && (<div className="flex justify-center py-2"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>)}
        {messages.map((msg, idx) => {
            const isFirstMessage = idx === 0;
            return (
                <div key={msg._id || idx} ref={(el) => { messageRefs.current[String(msg._id)] = el; if (isFirstMessage) lastMsgRef(el); }}>
                    <MessageItem msg={msg} userId={String(props.currentUser?._id)} {...props} />
                </div>
            );
        })}
    </>
));

MessageList.displayName = "MessageList";

export default MessageList;
