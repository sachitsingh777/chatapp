import { useMutation } from "convex/react";
import { useState } from "react"

export const useMutationState=(mutationToRun:any)=>{
  const [pending,setpending]=useState(false);

  const mutationFn=useMutation(mutationToRun)

const mutate=(payload:any)=>{
  setpending(true)
   
  return mutationFn(payload).then((res)=>{
    return res
  })
  .catch((error)=>{
    throw error;
  })
  .finally(()=>setpending(false));

};

return {mutate,pending}
}