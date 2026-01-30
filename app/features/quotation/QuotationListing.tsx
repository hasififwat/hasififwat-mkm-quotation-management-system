import { useState } from "react";
import { DataTable } from "./components/QuotationTable/data-table";
import { columns, type Quotation } from "./components/QuotationTable/columns";

interface Props {
  data: Quotation[];
}

const QuotationListing: React.FC<Props> = ({ data }) => {
  // Logic for preview can be added here later
  const handlePreview = (quotation: Quotation) => {
    console.log("Preview quotation", quotation);
  };

  return (
    <div>
      <DataTable columns={columns} data={data} handlePreview={handlePreview} />
    </div>
  );
};

export default QuotationListing;
