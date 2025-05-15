import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '~/supabase/client';
import { Payments, PaymentsInsert } from '~/types';
import {messageRepository} from "~/db/messages";
import {NewPayment} from "~/db/schema";

export function usePayments() {
  const queryClient = useQueryClient();

  // Get payments by user ID
  const getPayments = (userId: string) => {
    return useQuery({
      queryKey: ['payments', userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Payments[];
      },
    });
  };

  // Create payment
  const createPayment = useMutation({
    mutationFn: async (newPayment: NewPayment) => {
      return messageRepository.createPayment(newPayment);

      /*const { data, error } = await supabase
        .from('payments')
        .insert(newPayment)
        .select()
        .single();

      if (error) throw error;
      return data;*/
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.sender] });
    },
  });

  // Update payment
  const updatePayment = useMutation({
    mutationFn: async (updates: Partial<NewPayment>) => {
      return messageRepository.updatePayment(updates)

      /*const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;*/
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments', data.sender] });
    },
  });

  // Delete payment
  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  return {
    getPayments,
    createPayment,
    updatePayment,
    deletePayment,
  };
}
