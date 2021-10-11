import { Contract, ContractReceipt, ContractTransaction } from "ethers";
import React from "react";
import { useEffect, useState } from "react";
import { NotificationType, TransactionStatus } from "src/helpers/types";
import { showTransactionLinkDialog, showNotification } from "src/helpers/utilities";
import { IBook } from "src/models/library/library.models";
import styled from "styled-components";
import Button from "./Button";
import Loader from "./Loader";
// tslint:disable:no-console

interface IBookLibraryDashboardProps {
    connected: boolean;
    bookLibraryContract: Contract | null;
}

const STable = styled.table`
    width: 100%;
    border-collapse: collapse;

    td, th {
        border: 1px solid #ddd;
        padding: 8px;
    }

    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #a9f7d7; }

    th {
        padding-top: 12px;
        padding-bottom: 12px;
        text-align: center;
        background-color: #21D98D;
        color: black;
      }

    tfoot {
        margin-top: 12px;
    }
`

const SInput = styled.input`
    margin: 0 5px;
    border-radius: 5px;
    height: 30px;
`
const SForm = styled.form`
    width: 100%;
`

const SContainer = styled.div`
    display: flex;
    width:100%;
`

const BookLibraryDashboard = (props: IBookLibraryDashboardProps) => {
    const TRANSACTION_STARTED_MESSAGE = 'Transaction started. Check status from the link.';
    const [loading, setLoading] = useState<boolean>(false);
    const [operationInProgress, setOperationInProgress] = useState<boolean>(false);
    const [books, setBooks] = useState<IBook[]>();
    const [newBook, setNewBookData] = useState<IBook>({
        id: '',
        title: '',
        copies: 0,
        numberOfCopies: 0,
    });
    const useMountEffect = (callback: any) => useEffect(callback, [])

    useEffect(() => {
        if (props.bookLibraryContract) {
            setLoading(true);
            updateBooks(props.bookLibraryContract)
                .then(() => showNotification('Books loaded.'))
                .catch((reason) => processError(reason))
                .finally(() => setLoading(false));
        }
    }, []);

    useMountEffect(() => {
        props.bookLibraryContract?.on("BookAdded", async (id: any, title: string, numberOfCopies: number) => {
            showNotification(`${numberOfCopies} copies of "${title}" have been added to the library.`);
            await updateBooks(props.bookLibraryContract);
        });

        props.bookLibraryContract?.on("BookBorrowed", async (id: any, user: any) => {
            showNotification(`Book has been borrowed by ${user}`);
            await updateBooks(props.bookLibraryContract);
        });

        props.bookLibraryContract?.on("BookReturned", async (id: any, user: any) => {
            showNotification(`Book has been returned by ${user}`);
            await updateBooks(props.bookLibraryContract);
        });
    });

    const updateBooks = async (contract: any) => {
        return contract
            .getAvailableBooks()
            .then((result: any) => {
                setBooks(result.map((book: any) => {
                    return {
                        ...book,
                        numberOfCopies: book.numberOfCopies.toNumber()
                    }
                }));
            })
    };

    const handleInput = (e: any) => {
        const newBookObj = { ...newBook || {}, [e.target.name.toLowerCase()]: e.target.value }
        setNewBookData(newBookObj);
    };

    const handleAddBook = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        props.bookLibraryContract
            ?.addBook(newBook.title, newBook.copies)
            .then((transaction: ContractTransaction) => {
                showTransactionLinkDialog(TRANSACTION_STARTED_MESSAGE, transaction.hash);
                transaction
                    .wait()
                    .then((receipt: ContractReceipt) => processReceipt(receipt))
                    .catch(reason => processError(reason))
                    .finally(() => setLoading(false));
            })
            .catch((reason: any) => {
                setLoading(false);
                processError(reason)
            });
    };

    const handleBorrowBook = async (e: React.FormEvent<any>, bookId: any) => {
        e.preventDefault();
        setOperationInProgress(true);

        props.bookLibraryContract
            ?.borrowBook(bookId)
            .then((transaction: ContractTransaction) => {
                showTransactionLinkDialog(TRANSACTION_STARTED_MESSAGE, transaction.hash);
                transaction
                    .wait()
                    .then((receipt: ContractReceipt) => processReceipt(receipt))
                    .catch(reason => processError(reason))
                    .finally(() => setOperationInProgress(false));
            })
            .catch((reason: any) => {
                setOperationInProgress(false);
                processError(reason)
            });
    };

    const handleReturnBook = async (e: React.FormEvent<any>, bookId: string) => {
        e.preventDefault();
        setOperationInProgress(true);

        props.bookLibraryContract
            ?.returnBook(bookId)
            .then((transaction: ContractTransaction) => {
                showTransactionLinkDialog(TRANSACTION_STARTED_MESSAGE, transaction.hash);
                transaction
                    .wait()
                    .then((receipt: any) => processReceipt(receipt))
                    .catch((reason: any) => processError(reason))
                    .finally(() => setOperationInProgress(false));
            })
            .catch((reason: any) => {
                setOperationInProgress(false);
                processError(reason)
            });
    };

    const handleRefresh = async (e: React.FormEvent<any>) => {
        e.preventDefault();
        setLoading(true);

        updateBooks(props.bookLibraryContract)
            .then(() => showNotification('Books info refreshed.'))
            .catch((reason) => processError(reason))
            .finally(() => setLoading(false));

    };

    const processReceipt = (receipt: ContractReceipt) => {
        if (receipt.status && receipt.status !== TransactionStatus.SUCCESSFUL) {
            showNotification('Operation is not successful!', NotificationType.ERROR);
            return;
        }

        showNotification('Operation is successful.');
    };

    const processError = (reason: any) => {
        if (reason.error) {
            showNotification(`Error: ${reason.error.message}`, NotificationType.ERROR);
            return;
        }

        if (reason.message) {
            showNotification(`Error: ${reason.message}`, NotificationType.ERROR);
            return;
        }

        showNotification(`Operation failed. Reason: ${JSON.stringify(reason)}`, NotificationType.ERROR);
    }

    return (
        <>
            <h3>Add a Book</h3>
            <SContainer>
                <SForm onSubmit={handleAddBook}>
                    <SInput
                        key="title"
                        name="Title"
                        placeholder="Title"
                        onInput={(e) => handleInput(e)}
                        type="string"
                        required
                    />
                    <SInput
                        key="copies"
                        name="Copies"
                        placeholder="Copies"
                        onInput={(e) => handleInput(e)}
                        type="number"
                        required
                    />
                    <Button type="submit">
                        Add book
                    </Button>
                </SForm>
            </SContainer>
            {loading ? <Loader size={64} /> : (
                <>
                    <h3 style={{ marginTop: '50px' }}>Books Dashboard</h3>
                    <STable>
                        <tbody>
                            <tr>
                                <th>Title</th>
                                <th>Copies Available</th>
                                <th colSpan={2}>Actions</th>
                            </tr>
                            {loading ? <Loader size={64} /> : books?.map((book, idx) => (
                                <tr key={idx}>
                                    <td>{book.title}</td>
                                    <td>{book.numberOfCopies}</td>
                                    <td>
                                        <div style={{ minWidth: '80px', width: '80px' }} >
                                            <Button fetching={operationInProgress} disabled={operationInProgress} type="button" onClick={(e: any) => handleBorrowBook(e, book.id)}>
                                                Borrow
                                            </Button>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ minWidth: '80px', width: '80px' }} >
                                            <Button fetching={operationInProgress} disabled={operationInProgress} type="button" onClick={(e: any) => handleReturnBook(e, book.id)} color="orange">
                                                Return
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            <tfoot>
                                <td style={{ border: 0 }}>
                                    <Button onClick={(e: any) => handleRefresh(e)} disabled={operationInProgress}>
                                        Refresh
                                    </Button>
                                </td>
                            </tfoot>
                        </tbody>
                    </STable>
                </>
            )}
        </>)
};

export default BookLibraryDashboard;