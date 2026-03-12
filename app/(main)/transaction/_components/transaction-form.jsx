"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { cn } from "@/lib/utils";
import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import { ReceiptScanner } from "./recipt-scanner";

export function AddTransactionForm({
  accounts,
  categories,
  editMode = false,
  initialData = null,
}) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit");

  const [aiCatLoading, setAiCatLoading] = useState(false);
  const [aiCatSuggestion, setAiCatSuggestion] = useState(null);
  const debounceRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues:
      editMode && initialData
        ? {
            type: initialData.type,
            amount: initialData.amount.toString(),
            description: initialData.description,
            accountId: initialData.accountId,
            category: initialData.category,
            date: new Date(initialData.date),
            isRecurring: initialData.isRecurring,
            ...(initialData.recurringInterval && {
              recurringInterval: initialData.recurringInterval,
            }),
          }
        : {
            type: "EXPENSE",
            amount: "",
            description: "",
            accountId: accounts.find((ac) => ac.isDefault)?.id,
            date: new Date(),
            isRecurring: false,
          },
  });

  // watch values AFTER useForm
  const description = watch("description");
  const amount = watch("amount");
  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");

  // AI category suggestion
  useEffect(() => {

    if (!description || description.length < 4) {
      setAiCatSuggestion(null);
      return;
    }

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {

      setAiCatLoading(true);

      try {

        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, amount, type }),
        });

        const data = await res.json();

        if (data.category) {
          setAiCatSuggestion(data);
        }

      } catch {}

      finally {
        setAiCatLoading(false);
      }

    }, 800);

  }, [description, amount, type]);

  const {
    loading: transactionLoading,
    fn: transactionFn,
    data: transactionResult,
  } = useFetch(editMode ? updateTransaction : createTransaction);

  const onSubmit = (data) => {

    const formData = {
      ...data,
      amount: parseFloat(data.amount),
    };

    if (editMode) {
      transactionFn(editId, formData);
    } else {
      transactionFn(formData);
    }

  };

  const handleScanComplete = (scannedData) => {

    if (scannedData) {

      setValue("amount", scannedData.amount.toString());
      setValue("date", new Date(scannedData.date));

      if (scannedData.description) {
        setValue("description", scannedData.description);
      }

      if (scannedData.category) {
        setValue("category", scannedData.category);
      }

      toast.success("Receipt scanned successfully");
    }
  };

  useEffect(() => {

    if (transactionResult?.success && !transactionLoading) {

      toast.success(
        editMode
          ? "Transaction updated successfully"
          : "Transaction created successfully"
      );

      reset();

      router.push(`/account/${transactionResult.data.accountId}`);
    }

  }, [transactionResult, transactionLoading, editMode]);

  const filteredCategories = categories.filter(
    (category) => category.type === type
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>

        <Select
          onValueChange={(value) => setValue("type", value)}
          defaultValue={type}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>

        </Select>

        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Amount + Account */}
      <div className="grid gap-6 md:grid-cols-2">

        <div className="space-y-2">

          <label className="text-sm font-medium">Amount</label>

          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />

          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}

        </div>

        <div className="space-y-2">

          <label className="text-sm font-medium">Account</label>

          <Select
            onValueChange={(value) => setValue("accountId", value)}
            defaultValue={getValues("accountId")}
          >

            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>

            <SelectContent>

              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} (${parseFloat(account.balance).toFixed(2)})
                </SelectItem>
              ))}

              <CreateAccountDrawer>
                <Button variant="ghost" className="w-full">
                  Create Account
                </Button>
              </CreateAccountDrawer>

            </SelectContent>

          </Select>

        </div>

      </div>

      {/* Category */}
      <div className="space-y-2">

        <label className="text-sm font-medium">Category</label>

        <Select
          onValueChange={(value) => setValue("category", value)}
          defaultValue={getValues("category")}
        >

          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>

          <SelectContent>

            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}

          </SelectContent>

        </Select>

      </div>

      {/* Date */}
      <div className="space-y-2">

        <label className="text-sm font-medium">Date</label>

        <Popover>

          <PopoverTrigger asChild>

            <Button
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>

          </PopoverTrigger>

          <PopoverContent className="w-auto p-0" align="start">

            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => setValue("date", date)}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />

          </PopoverContent>

        </Popover>

      </div>

      {/* Description */}
      <div className="space-y-2">

        <label className="text-sm font-medium">Description</label>

        <Input
          placeholder="Enter description"
          {...register("description")}
        />

      </div>

      {/* Recurring */}
      <div className="flex items-center justify-between border p-4 rounded-lg">

        <div>
          <label className="text-base font-medium">
            Recurring Transaction
          </label>
          <p className="text-sm text-muted-foreground">
            Set recurring schedule
          </p>
        </div>

        <Switch
          checked={isRecurring}
          onCheckedChange={(checked) => setValue("isRecurring", checked)}
        />

      </div>

      {/* Submit */}
      <div className="flex gap-4">

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.back()}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          className="w-full"
          disabled={transactionLoading}
        >

          {transactionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : editMode ? (
            "Update Transaction"
          ) : (
            "Create Transaction"
          )}

        </Button>

      </div>

    </form>
  );
}