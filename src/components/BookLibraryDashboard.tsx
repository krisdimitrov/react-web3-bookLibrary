import { Contract, ContractReceipt, ContractTransaction } from "ethers";
import React from "react";
import { useEffect, useState } from "react";
import { NotificationType, TransactionStatus } from "src/helpers/types";
import { showTransactionLinkDialog, showNotification } from "src/helpers/utilities";
import { IBook } from "src/models/library/library.models";
import styled from "styled-components";
import Button from "./Button";
import Loader from "./Loader";

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
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
    const [books, setBooks] = useState<IBook[]>();
    const [newBook, setNewBookData] = useState<IBook>({
        id: '',
        title: '',
        copies: 0
    });

    useEffect(() => {
        if (props.bookLibraryContract) {
            setLoading(true);
            updateBooks(props.bookLibraryContract)
                .then(() => showNotification('Books loaded.'))
                .catch(reason => processErrorAndNotify(reason))
                .finally(() => setLoading(false));

            subscribeToContractEvents(props.bookLibraryContract);
        }
    }, []);

    const subscribeToContractEvents = async (contract: Contract) => {
        contract.on("BookAdded", async (id: any, title: string, copies: number) => {
            showNotification(`${copies} copies of "${title}" have been added to the library.`);

            const update = async () => updateBooks(contract).catch(reason => processErrorAndNotify(reason));
            await update();
        });

        contract.on("BookBorrowed", async (id: any, title: string, user: any) => {
            showNotification(`${title} has been borrowed by ${user}`);

            const update = async () => updateBooks(contract).catch(reason => processErrorAndNotify(reason));
            await update();
        });

        contract.on("BookReturned", async (id: any, title: string, user: any) => {
            showNotification(`${title} has been returned by ${user}`);
            const update = async () => updateBooks(contract).catch(reason => processErrorAndNotify(reason));
            await update();
        });
    };

    const updateBooks = async (contract: any) => {
        const fetchBooks = async () => {
            const booksCount = (await contract.getBooksCount()).toNumber();
            const newBooks: IBook[] = [];

            for (let i = 0; i < booksCount; i++) {
                const bookId = await contract.bookIds(i);
                const book = await contract.books(bookId);
                newBooks.push(book);
            }
            return newBooks;
        }

        return fetchBooks()
            .then((books: IBook[]) => setBooks(books.map((book: any) => {
                return {
                    ...book,
                    copies: book.copies.toNumber()
                }
            })))
    }

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
                    .then((receipt: ContractReceipt) => processReceiptAndNotify(receipt))
                    .catch(reason => processErrorAndNotify(reason))
                    .finally(() => setLoading(false));
            })
            .catch((reason: any) => {
                setLoading(false);
                processErrorAndNotify(reason)
            });
    };

    const handleBorrowBook = async (e: React.FormEvent<any>, title: string) => {
        e.preventDefault();
        setTransactionInProgress(true);

        props.bookLibraryContract
            ?.borrowBook(title)
            .then((transaction: ContractTransaction) => {
                showTransactionLinkDialog(TRANSACTION_STARTED_MESSAGE, transaction.hash);
                transaction
                    .wait()
                    .then((receipt: ContractReceipt) => processReceiptAndNotify(receipt))
                    .catch(reason => processErrorAndNotify(reason))
                    .finally(() => setTransactionInProgress(false));
            })
            .catch((reason: any) => {
                setTransactionInProgress(false);
                processErrorAndNotify(reason);
            });
    };

    const handleReturnBook = async (e: React.FormEvent<any>, title: string) => {
        e.preventDefault();
        setTransactionInProgress(true);

        props.bookLibraryContract
            ?.returnBook(title)
            .then((transaction: ContractTransaction) => {
                showTransactionLinkDialog(TRANSACTION_STARTED_MESSAGE, transaction.hash);
                transaction
                    .wait()
                    .then((receipt: any) => processReceiptAndNotify(receipt))
                    .catch((reason: any) => processErrorAndNotify(reason))
                    .finally(() => setTransactionInProgress(false));
            })
            .catch((reason: any) => {
                setTransactionInProgress(false);
                processErrorAndNotify(reason);
            });
    };

    const handleRefresh = async (e: React.FormEvent<any>) => {
        e.preventDefault();
        setLoading(true);

        updateBooks(props.bookLibraryContract)
            .then(() => showNotification('Books info refreshed.'))
            .catch(reason => processErrorAndNotify(reason))
            .finally(() => setLoading(false));
    };

    const processReceiptAndNotify = (receipt: ContractReceipt) => {
        if (receipt.status && receipt.status !== TransactionStatus.SUCCESSFUL) {
            showNotification('Operation is not successful!', NotificationType.ERROR);
            return;
        }

        showNotification('Operation is successful.');
    };

    const processErrorAndNotify = (reason: any) => {
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
                                    <td>{book.copies}</td>
                                    <td>
                                        <div style={{ minWidth: '80px', width: '80px' }} >
                                            <Button fetching={transactionInProgress} disabled={transactionInProgress || book.copies === 0} type="button" onClick={(e: any) => handleBorrowBook(e, book.title)}>
                                                Borrow
                                            </Button>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ minWidth: '80px', width: '80px' }} >
                                            <Button fetching={transactionInProgress} disabled={transactionInProgress} type="button" onClick={(e: any) => handleReturnBook(e, book.title)} color="orange">
                                                Return
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            <tfoot>
                                <td style={{ border: 0 }}>
                                    <Button onClick={(e: any) => handleRefresh(e)} disabled={transactionInProgress}>
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