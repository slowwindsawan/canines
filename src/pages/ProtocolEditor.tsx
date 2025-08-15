import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ArrowBigLeft,
  ArrowBigLeftIcon,
  Save,
} from "lucide-react";
import { Link } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  dogName: string;
  gutHealthProtocol: {
    sections: Array<{
      id: string;
      title: string;
      description: string;
      items: Array<{
        id: string;
        title: string;
        description: string;
      }>;
    }>;
  };
  whatToDoNow: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  lastCheckRequest?: {
    date: string;
    priority: "high" | "medium" | "low";
  };
}

interface ProtocolEditor {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
}

const ProtocolEditor = ({}) => {
  const [editedUser, setEditedUser] = useState({
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    dogName: "Max",
    gutHealthProtocol: {
      sections: [
        {
          id: "daily-meal-plan",
          title: "Daily Meal Plan",
          description: "Structured feeding schedule and dietary requirements",
          items: [
            {
              id: "breakfast",
              title: "Breakfast",
              description:
                "Plain boiled chicken with rice (1 cup) - served at 7:00 AM",
            },
            {
              id: "dinner",
              title: "Dinner",
              description:
                "Boiled chicken with sweet potato (1.5 cups) - served at 6:00 PM",
            },
          ],
        },
        {
          id: "supplement-protocol",
          title: "Supplement Protocol",
          description:
            "Daily supplements and medications for digestive support",
          items: [
            {
              id: "probiotics",
              title: "Probiotics",
              description:
                "Administer twice daily with meals - morning and evening",
            },
            {
              id: "digestive-enzymes",
              title: "Digestive Enzymes",
              description: "One capsule sprinkled on food before each meal",
            },
          ],
        },
        {
          id: "lifestyle-recommendations",
          title: "Lifestyle Recommendations",
          description: "Daily activities and monitoring guidelines",
          items: [
            {
              id: "exercise",
              title: "Gentle Exercise",
              description:
                "Short 10-minute walks, avoid strenuous activity for 7 days",
            },
            {
              id: "monitoring",
              title: "Bowel Movement Monitoring",
              description:
                "Track frequency, consistency, and any changes daily",
            },
          ],
        },
      ],
    },
    whatToDoNow: [
      {
        id: "1a",
        title: "Give morning probiotic",
        description: "Administer with breakfast, ensure full dose",
      },
      {
        id: "1b",
        title: "Check water intake",
        description: "Monitor throughout day, should drink 2-3 bowls",
      },
      {
        id: "1c",
        title: "Monitor energy levels",
        description: "Note any changes in activity or lethargy",
      },
    ],
    lastCheckRequest: {
      date: "2025-01-12",
      priority: "high",
    },
  });
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedProtocolItem, setDraggedProtocolItem] = useState<{
    sectionId: string;
    itemId: string;
  } | null>(null);

  const handleProtocolTodoChange = (index: number, value: string) => {
    // Legacy function - no longer used
  };

  const addProtocolTodo = () => {
    // Legacy function - no longer used
  };

  const removeProtocolTodo = (index: number) => {
    // Legacy function - no longer used
  };

  const handleSectionChange = (
    sectionId: string,
    field: "title" | "description",
    value: string
  ) => {
    const newUser = { ...editedUser };
    const sectionIndex = newUser.gutHealthProtocol.sections.findIndex(
      (section) => section.id === sectionId
    );
    if (sectionIndex !== -1) {
      newUser.gutHealthProtocol.sections[sectionIndex][field] = value;
      setEditedUser(newUser);
    }
  };

  const addSection = () => {
    const newUser = { ...editedUser };
    const newSection = {
      id: Date.now().toString(),
      title: "",
      description: "",
      items: [],
    };
    newUser.gutHealthProtocol.sections.push(newSection);
    setEditedUser(newUser);
  };

  const removeSection = (sectionId: string) => {
    const newUser = { ...editedUser };
    newUser.gutHealthProtocol.sections =
      newUser.gutHealthProtocol.sections.filter(
        (section) => section.id !== sectionId
      );
    setEditedUser(newUser);
  };

  const handleSectionItemChange = (
    sectionId: string,
    itemId: string,
    field: "title" | "description",
    value: string
  ) => {
    const newUser = { ...editedUser };
    const sectionIndex = newUser.gutHealthProtocol.sections.findIndex(
      (section) => section.id === sectionId
    );
    if (sectionIndex !== -1) {
      const itemIndex = newUser.gutHealthProtocol.sections[
        sectionIndex
      ].items.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) {
        newUser.gutHealthProtocol.sections[sectionIndex].items[itemIndex][
          field
        ] = value;
        setEditedUser(newUser);
      }
    }
  };

  const addSectionItem = (sectionId: string) => {
    const newUser = { ...editedUser };
    const sectionIndex = newUser.gutHealthProtocol.sections.findIndex(
      (section) => section.id === sectionId
    );
    if (sectionIndex !== -1) {
      const newItem = {
        id: Date.now().toString(),
        title: "",
        description: "",
      };
      newUser.gutHealthProtocol.sections[sectionIndex].items.push(newItem);
      setEditedUser(newUser);
    }
  };

  const removeSectionItem = (sectionId: string, itemId: string) => {
    const newUser = { ...editedUser };
    const sectionIndex = newUser.gutHealthProtocol.sections.findIndex(
      (section) => section.id === sectionId
    );
    if (sectionIndex !== -1) {
      newUser.gutHealthProtocol.sections[sectionIndex].items =
        newUser.gutHealthProtocol.sections[sectionIndex].items.filter(
          (item) => item.id !== itemId
        );
      setEditedUser(newUser);
    }
  };

  const handleItemDragStart = (
    e: React.DragEvent,
    sectionId: string,
    itemId: string
  ) => {
    setDraggedProtocolItem({ sectionId, itemId });
  };

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleItemDrop = (
    e: React.DragEvent,
    targetSectionId: string,
    targetItemId: string
  ) => {
    e.preventDefault();
    if (!draggedProtocolItem) return;

    const newUser = { ...editedUser };
    const sourceSectionIndex = newUser.gutHealthProtocol.sections.findIndex(
      (section) => section.id === draggedProtocolItem.sectionId
    );
    const targetSectionIndex = newUser.gutHealthProtocol.sections.findIndex(
      (section) => section.id === targetSectionId
    );

    if (sourceSectionIndex !== -1 && targetSectionIndex !== -1) {
      const sourceItemIndex = newUser.gutHealthProtocol.sections[
        sourceSectionIndex
      ].items.findIndex((item) => item.id === draggedProtocolItem.itemId);
      const targetItemIndex = newUser.gutHealthProtocol.sections[
        targetSectionIndex
      ].items.findIndex((item) => item.id === targetItemId);

      if (sourceItemIndex !== -1 && targetItemIndex !== -1) {
        // Remove item from source section
        const [draggedItem] = newUser.gutHealthProtocol.sections[
          sourceSectionIndex
        ].items.splice(sourceItemIndex, 1);

        // Add item to target section at target position
        newUser.gutHealthProtocol.sections[targetSectionIndex].items.splice(
          targetItemIndex,
          0,
          draggedItem
        );

        setEditedUser(newUser);
      }
    }
    setDraggedProtocolItem(null);
  };

  const handleWhatToDoChange = (
    id: string,
    field: "title" | "description",
    value: string
  ) => {
    const newUser = { ...editedUser };
    const itemIndex = newUser.whatToDoNow.findIndex((item) => item.id === id);
    if (itemIndex !== -1) {
      newUser.whatToDoNow[itemIndex][field] = value;
      setEditedUser(newUser);
    }
  };

  const addWhatToDo = () => {
    const newUser = { ...editedUser };
    const newItem = {
      id: Date.now().toString(),
      title: "",
      description: "",
    };
    newUser.whatToDoNow.push(newItem);
    setEditedUser(newUser);
  };

  const removeWhatToDo = (id: string) => {
    const newUser = { ...editedUser };
    newUser.whatToDoNow = newUser.whatToDoNow.filter((item) => item.id !== id);
    setEditedUser(newUser);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newUser = { ...editedUser };
    const draggedIndex = newUser.whatToDoNow.findIndex(
      (item) => item.id === draggedItem
    );
    const targetIndex = newUser.whatToDoNow.findIndex(
      (item) => item.id === targetId
    );

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = newUser.whatToDoNow.splice(draggedIndex, 1);
      newUser.whatToDoNow.splice(targetIndex, 0, removed);
      setEditedUser(newUser);
    }
    setDraggedItem(null);
  };

  const handleSave = () => {
    alert("Saved and notified.");
  };

  return (
    <div className="p-6 space-y-8">
      {/* Gut Health Protocol Sections */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Link to="/admin/submissions">
            <ArrowBigLeftIcon className="mr-2" size={18} />
          </Link>
          Protocol and plan editor
        </h3>
        <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 items-center">
          {editedUser.gutHealthProtocol.sections.map((section) => (
            <>
              <div
                key={section.id}
                className="border border-brand-charcoal bg-brand-offwhite p-4 rounded-lg shadow-md h-[500px] m-auto"
                style={{ overflowY: "scroll" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        handleSectionChange(section.id, "title", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 focus:border-black outline-none font-medium"
                      placeholder="Section title"
                    />
                    <textarea
                      value={section.description}
                      onChange={(e) =>
                        handleSectionChange(
                          section.id,
                          "description",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border border-gray-300 focus:border-black outline-none text-sm resize-none"
                      rows={2}
                      placeholder="Section description"
                    />
                  </div>
                  <button
                    onClick={() => removeSection(section.id)}
                    className="p-2 border border-gray-300 hover:border-black transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Items:</h4>
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) =>
                        handleItemDragStart(e, section.id, item.id)
                      }
                      onDragOver={handleItemDragOver}
                      onDrop={(e) => handleItemDrop(e, section.id, item.id)}
                      className="flex items-start gap-2 bg-gray-50 p-3 cursor-move hover:bg-gray-100 transition-colors"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            handleSectionItemChange(
                              section.id,
                              item.id,
                              "title",
                              e.target.value
                            )
                          }
                          className="w-full p-2 border border-gray-300 focus:border-black outline-none font-medium"
                          placeholder="Item title"
                        />
                        <textarea
                          value={item.description}
                          onChange={(e) =>
                            handleSectionItemChange(
                              section.id,
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full p-2 border border-gray-300 focus:border-black outline-none text-sm resize-none"
                          rows={2}
                          placeholder="Item description"
                        />
                      </div>
                      <button
                        onClick={() => removeSectionItem(section.id, item.id)}
                        className="p-2 border border-gray-300 hover:border-black transition-colors mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addSectionItem(section.id)}
                    className="flex items-center gap-2 p-2 border border-gray-300 hover:border-black transition-colors w-full justify-center text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>
            </>
          ))}
          <button
            onClick={addSection}
            className="flex items-center gap-2 p-3 border border-gray-300 hover:border-black transition-colors w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>
      </div>
      <button className="p-2 rounded-lg bg-brand-charcoal text-brand-offwhite m-auto w-[100%] flex justify-center itmes-center">
        Save and notify
      </button>
    </div>
  );
};

export default ProtocolEditor;
