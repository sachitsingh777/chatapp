"use client"
import { Card } from '@/components/ui/card'
import { api } from '@/convex/_generated/api'
import { useConversation } from '@/hooks/useConversation'
import { useMutationState } from '@/hooks/useMutationState'
import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

type Props = {}

const chatMessageSchema=z.object({
    content:z.string().min(1,{
        message:"This field cant be empty"
        
    }),
})

const ChatInput = (props: Props) => {
  const {conversationId}=useConversation();

const {mutate:createMessage,pending}=useMutationState(api.message.create)
  
const form=useForm<z.infer<typeof chatMessageSchema>>({
    resolver:zodResolver(chatMessageSchema),
    defaultValues:{
        content:""
    }
})


return (
    <Card className='w-full p-2 rounded-lg relative'>ChatInput</Card>
  )
}

export default ChatInput