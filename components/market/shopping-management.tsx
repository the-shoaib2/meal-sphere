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
import { Loader2, Plus, ShoppingBag, Trash2, MoreHorizontal, Pencil, Check } from "lucide-react"
import { useShopping, type ShoppingItem, type ShoppingPageData } from "@/hooks/use-shopping"
import { useActiveGroup } from "@/contexts/group-context"
import { useSession } from "next-auth/react"
import { toast } from "react-hot-toast"
import { LoadingWrapper, Loader } from "@/components/ui/loader"
import { useCurrentPeriod } from "@/hooks/use-periods";
import { useGroupAccess } from "@/hooks/use-group-access";
import { PageHeader } from "@/components/shared/page-header";

interface ShoppingManagementProps {
  initialData?: ShoppingPageData;
  initialAccessData?: any;
}

export default function ShoppingManagement({ initialData, initialAccessData }: ShoppingManagementProps) {
  const { data: session } = useSession()
  const { activeGroup } = useActiveGroup()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [itemName, setItemName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [unit, setUnit] = useState("")
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)

  // Check user permissions
  const { userRole: userRoleFromHook, isLoading: isAccessLoading } = useGroupAccess({
    groupId: activeGroup?.id || "",
    initialData: initialAccessData
  })
  const userRole = (initialData && initialData.groupId === activeGroup?.id) ? initialData.userRole : userRoleFromHook;

  // Get current period
  const { data: currentPeriodFromHook } = useCurrentPeriod()
  const effectivePeriod = (initialData && initialData.groupId === activeGroup?.id) ? initialData.currentPeriod : currentPeriodFromHook;

  const {
    items: shoppingItems = [],
    isLoading,
    addItem,
    updateItem,
    togglePurchased,
    deleteItem,
    clearPurchased,
  } = useShopping(effectivePeriod?.id, initialData)

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

  const purchasedItems = safeShoppingItems.filter((item: ShoppingItem) => item.purchased)
  const pendingItems = safeShoppingItems.filter((item: ShoppingItem) => !item.purchased)



  return (
    <LoadingWrapper isLoading={isLoading || isAccessLoading} minHeight="70vh">
      <div className="space-y-6">
        <PageHeader
          heading="Shopping List"
          text={`Manage your shopping items for ${activeGroup?.name || "your group"}`}
        >
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
            <DialogContent className="w-[calc(100%-2rem)] max-w-[425px] mx-auto rounded-lg">
              <DialogHeader className="pb-4">
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add Shopping Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the item details below' : 'Enter the details of the item you want to add'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddOrUpdateItem}>
                <div className="grid gap-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Rice, Eggs"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="e.g. kg, L"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full sm:w-auto" disabled={addItem.isPending || updateItem.isPending}>
                    {(addItem.isPending || updateItem.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingItem ? 'Update Item' : 'Add to List'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {
          safeShoppingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/10 border-dashed">
              <div className="bg-background p-3 rounded-full shadow-sm mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Your shopping list is empty</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
                Everything seems to be stocked up! Add items when you need them.
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
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleTogglePurchased(item)}
                              disabled={togglePurchased.isPending}
                            >
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
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              By {item.addedBy?.name || 'Unknown'}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteClick(item.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                        <TableRow>
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
                                className="h-8 w-8 rounded-full border-green-200"
                                onClick={() => handleTogglePurchased(item)}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium line-through text-muted-foreground">{item.name}</span>
                                <span className="text-sm text-muted-foreground">{item.quantity} {item.unit}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteClick(item.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )
        }

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the item.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog >
      </div>
    </LoadingWrapper>
  )
}
