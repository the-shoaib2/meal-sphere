"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { Check, Loader2, Plus, ShoppingBag, Trash2, MoreHorizontal, Pencil } from "lucide-react"
import { useShopping, type ShoppingItem } from "@/hooks/use-shopping"
import { useActiveGroup } from "@/contexts/group-context"
import { useSession } from "next-auth/react"
import { toast } from "react-hot-toast"
import { Skeleton } from "@/components/ui/skeleton"
import PeriodNotFoundCard from "@/components/periods/period-not-found-card";
import { useCurrentPeriod } from "@/hooks/use-periods";
import { useGroupAccess } from "@/hooks/use-group-access";
import { useQuery } from "@tanstack/react-query";
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { useGroups } from "@/hooks/use-groups";


export default function ShoppingManagement() {
  const { data: session, status } = useSession()
  const { activeGroup } = useActiveGroup()
  const { data: userGroups = [], isLoading: isLoadingGroups } = useGroups();
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [itemName, setItemName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [unit, setUnit] = useState("")
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  // Check user permissions
  const { userRole, isMember, isLoading: isAccessLoading } = useGroupAccess({ groupId: activeGroup?.id || "" })

  // Check if user has no groups - show empty state
  if (!isLoadingGroups && userGroups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shopping List</h1>
            <p className="text-muted-foreground text-sm">
              Manage your shopping items
            </p>
          </div>
        </div>
        <NoGroupState />
      </div>
    );
  }

  // Get current period and also fetch recent periods if no current one exists
  const { data: currentPeriod, isLoading: isPeriodLoading } = useCurrentPeriod()

  // Fetch recent periods to fallback if no active period
  const { data: periodsData } = useQuery({
    queryKey: ['periods', activeGroup?.id, 'recent'],
    queryFn: async () => {
      if (!activeGroup?.id) return null;
      const res = await fetch(`/api/periods?groupId=${activeGroup.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeGroup?.id && !currentPeriod && !isPeriodLoading
  });

  const mostRecentPeriod = periodsData?.periods?.[0];
  const effectivePeriod = currentPeriod || mostRecentPeriod;

  // Check if user can manage meal settings (only when not loading)
  const canManageMealSettings = !isAccessLoading && userRole && ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(userRole)
  const {
    items: shoppingItems = [],
    isLoading,
    addItem,
    updateItem,
    togglePurchased,
    deleteItem,
    clearPurchased,
  } = useShopping(effectivePeriod?.id)



  // Type guard to ensure shoppingItems is an array
  const safeShoppingItems = Array.isArray(shoppingItems) ? shoppingItems : []

  const handleTogglePurchased = async (item: ShoppingItem) => {
    try {
      await togglePurchased.mutateAsync({
        id: item.id,
        purchased: !item.purchased,
      })
      toast.success(`Item marked as ${item.purchased ? 'not purchased' : 'purchased'}`)
    } catch (error) {
      console.error('Failed to update item:', error)
      toast.error('Failed to update item. Please try again.')
    }
  }

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId)
    setIsDeleteDialogOpen(true)
  }

  const handleEditClick = (item: ShoppingItem) => {
    setEditingItem(item)
    setItemName(item.name)
    setQuantity(item.quantity.toString())
    setUnit(item.unit || '')
    setShowAddDialog(true)
  }

  const handleAddOrUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await updateItem.mutateAsync({
          id: editingItem.id,
          name: itemName,
          quantity: parseInt(quantity) || 1,
          unit: unit || undefined,
        })
        toast.success('Item updated successfully')
      } else {
        await addItem.mutateAsync({
          name: itemName,
          quantity: parseInt(quantity) || 1,
          unit: unit || undefined,
        })
        toast.success('Item added to shopping list')
      }
      setItemName('')
      setQuantity('1')
      setUnit('')
      setShowAddDialog(false)
      setEditingItem(null)
    } catch (error) {
      console.error('Failed to save item:', error)
      toast.error(`Failed to ${editingItem ? 'update' : 'add'} item. Please try again.`)
    }
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    try {
      await deleteItem.mutateAsync(itemToDelete)
      toast.success('Item deleted')
    } catch (error) {
      console.error('Failed to delete item:', error)
      toast.error('Failed to delete item. Please try again.')
    } finally {
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const handleClearPurchased = async () => {
    if (window.confirm('Are you sure you want to clear all purchased items?')) {
      try {
        await clearPurchased.mutateAsync()
        toast.success('Cleared purchased items')
      } catch (error) {
        console.error('Failed to clear purchased items:', error)
        toast.error('Failed to clear purchased items. Please try again.')
      }
    }
  }

  const purchasedItems = safeShoppingItems.filter((item: ShoppingItem) => item.purchased)
  const pendingItems = safeShoppingItems.filter((item: ShoppingItem) => !item.purchased)

  // Show PeriodNotFoundCard only if NO period exists at all (neither active nor recent)
  if (!effectivePeriod && !isPeriodLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Shopping List</h2>
            <p className="text-muted-foreground">
              {activeGroup?.name ? `For ${activeGroup.name}` : 'Select a group to get started'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog
              open={showAddDialog}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingItem(null)
                  setItemName('')
                  setQuantity('1')
                  setUnit('')
                }
                setShowAddDialog(open)
              }}
            >
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-[425px] mx-auto rounded-lg sm:rounded-lg">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-xl sm:text-2xl">{editingItem ? 'Edit Item' : 'Add Shopping Item'}</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    {editingItem ? 'Update the item details below' : 'Enter the details of the item you want to add to your shopping list'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddOrUpdateItem}>
                  <div className="grid gap-4 sm:gap-6 py-2">
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="name" className="text-sm sm:text-base">
                        Item Name
                      </Label>
                      <Input
                        id="name"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 h-10 sm:h-auto"
                        placeholder="e.g. Rice, Eggs, Milk, etc."
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="quantity" className="text-sm sm:text-base">
                          Quantity
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 h-10 sm:h-auto"
                          required
                        />
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="unit" className="text-sm sm:text-base">
                          Unit (optional)
                        </Label>
                        <Input
                          id="unit"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full text-sm sm:text-base px-3 sm:px-4 py-2 h-10 sm:h-auto"
                          placeholder="e.g. kg, L, pcs, g"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto px-6 sm:px-8 text-sm sm:text-base h-10 sm:h-auto"
                      disabled={addItem.isPending || updateItem.isPending}
                    >
                      {(addItem.isPending || updateItem.isPending) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          {editingItem ? 'Updating...' : 'Adding...'}
                        </>
                      ) : editingItem ? (
                        'Update Item'
                      ) : (
                        'Add to List'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <PeriodNotFoundCard
          userRole={userRole}
          isLoading={isPeriodLoading}
          groupId={activeGroup?.id}
          userId={session?.user?.id}
        />
      </div>
    );
  }



  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-6">
          {/* Pending Items Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Purchased Items Skeleton */}
          <Card className="border-green-100">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !activeGroup ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No group selected</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Please select a group from the sidebar to view and manage its shopping list.
          </p>
        </div>
      ) : (
        <>
          {safeShoppingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/10 border-dashed">
              <div className="bg-background p-3 rounded-full shadow-sm mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Your shopping list is empty</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
                {effectivePeriod
                  ? "Everything seems to be stocked up! Add items when you need them."
                  : "No items found for this period."}
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add First Item
              </Button>
            </div>
          ) : (
            <>
              {pendingItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Items to Buy</CardTitle>
                    <CardDescription>Pending items in your shopping list</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pendingItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleTogglePurchased(item)}
                              disabled={togglePurchased.isPending}
                            >
                              <span className="sr-only">Mark as purchased</span>
                              <div className="h-4 w-4 rounded-full border bg-white" />
                            </Button>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                              Added by {item.addedBy?.name || 'Unknown'}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">More options</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(item.id)}
                                  disabled={deleteItem.isPending}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {purchasedItems.length > 0 && (
                <Card className="border-green-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-green-800">Purchased Items</CardTitle>
                    <CardDescription className="text-green-700">
                      {purchasedItems.length} item{purchasedItems.length !== 1 ? 's' : ''} purchased
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[40px]">Status</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchasedItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-green-200 border-green-200"
                                onClick={() => handleTogglePurchased(item)}
                                disabled={togglePurchased.isPending}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                                <span className="sr-only">Mark as not purchased</span>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium line-through text-muted-foreground">
                                  {item.name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {item.quantity} {item.unit}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center space-x-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">More options</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteClick(item.id)}
                                      disabled={deleteItem.isPending}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item from the shopping list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteItem.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
