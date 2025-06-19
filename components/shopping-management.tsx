"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { Check, Loader2, Plus, ShoppingBag, Trash2 } from "lucide-react"
import { useShopping, type ShoppingItem } from "@/hooks/use-shopping"
import { useActiveGroup } from "@/contexts/group-context"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

export default function ShoppingManagement() {
  const { data: session, status } = useSession()
  const { activeGroup } = useActiveGroup()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [itemName, setItemName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [unit, setUnit] = useState("")
  
  const {
    items: shoppingItems = [],
    isLoading,
    addItem,
    updateItem,
    togglePurchased,
    deleteItem,
    clearPurchased,
  } = useShopping()
  
  // Type guard to ensure shoppingItems is an array
  const safeShoppingItems = Array.isArray(shoppingItems) ? shoppingItems : []

  const handleAddShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addItem.mutateAsync({
        name: itemName,
        quantity: parseInt(quantity) || 1,
        unit: unit || undefined,
      })
      setItemName("")
      setQuantity("1")
      setUnit("")
      setShowAddDialog(false)
      toast.success('Item added to shopping list')
    } catch (error) {
      console.error('Failed to add item:', error)
      toast.error('Failed to add item. Please try again.')
    }
  }

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

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem.mutateAsync(itemId)
        toast.success('Item deleted')
      } catch (error) {
        console.error('Failed to delete item:', error)
        toast.error('Failed to delete item. Please try again.')
      }
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
          {safeShoppingItems.some((item: ShoppingItem) => item.purchased) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearPurchased}
              disabled={clearPurchased.isPending}
            >
              {clearPurchased.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear Purchased'
              )}
            </Button>
          )}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button disabled={!activeGroup}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddShoppingItem}>
                <DialogHeader>
                  <DialogTitle>Add Item to Shopping List</DialogTitle>
                  <DialogDescription>
                    Add a new item to the shopping list for {activeGroup?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="itemName" className="text-right">
                      Item Name
                    </Label>
                    <Input
                      id="itemName"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g. Milk, Eggs, Bread"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity" className="text-right">
                      Quantity
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="col-span-1"
                    />
                    <div className="col-span-2">
                      <Input
                        id="unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="e.g. kg, L, pcs"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={addItem.isPending}>
                    {addItem.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Item'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                          <div className="h-4 w-4 rounded border" />
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteItem.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete item</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {purchasedItems.length > 0 && (
            <Card className="border-green-100 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-800">Purchased Items</CardTitle>
                <CardDescription className="text-green-700">
                  {purchasedItems.length} item{purchasedItems.length !== 1 ? 's' : ''} purchased
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {purchasedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-white">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-full bg-green-100 hover:bg-green-200 border-green-200"
                          onClick={() => handleTogglePurchased(item)}
                          disabled={togglePurchased.isPending}
                        >
                          <Check className="h-3 w-3 text-green-600" />
                          <span className="sr-only">Mark as not purchased</span>
                        </Button>
                        <span className="line-through text-muted-foreground">
                          {item.name} ({item.quantity} {item.unit})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive/80"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteItem.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete item</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {safeShoppingItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No items in your shopping list</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                Add items to your shopping list to get started.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add your first item
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
